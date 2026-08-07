"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import {Brand} from "@/components/Brand";
import {
  FULL_MAP_VIEW,
  MIN_MAP_VIEW_WIDTH,
  clusterDetections,
  clusterEventsForMap,
  eventIsInMapView,
  isProbableFire,
  projectFirePosition,
  zoomMapView,
  type Detection,
  type MapCluster,
  type MapView,
  type ObservedEvent,
} from "@/lib/fire-observatory";
import {pointIsInBoundaryFeature, pointIsInFrance, type BoundaryCollection} from "@/lib/france-boundary";

type Position = [number, number];
type DepartmentFeature = {
  type: "Feature";
  properties: {code: string; nom: string; region?: string};
  geometry: {type: "Polygon"; coordinates: Position[][]} | {type: "MultiPolygon"; coordinates: Position[][][]};
};
type DepartmentCollection = {type: "FeatureCollection"; features: DepartmentFeature[]};
type FireResponse = {source: string; fetchedAt: string; days: number; detections: Detection[]};
type FireError = {error: "missing_key" | "invalid_key" | "source_unavailable"; message: string};
type LocationInfo = {
  title: string;
  level: "locality" | "commune" | "department" | "region";
  locality: string | null;
  commune: string | null;
  district: string | null;
  department: string | null;
  region: string | null;
  postcode: string | null;
};
type ImageryChoice = {
  date: string;
  from: string;
  to: string;
  platform: "sentinel2";
  source: string;
  cloudCoverage: number;
  composite: boolean;
};
type LatestImagery = {eventId: string; image: ImageryChoice};
type Verification = {
  level: "mapped" | "official" | null;
  label?: string;
  sourceName?: string;
  sourceUrl?: string;
  observedAt?: string | null;
  publishedAt?: string;
  areaHa?: number | null;
  effisStatus: "available" | "unavailable" | "not_needed";
};
type FireFilter = "all" | "confirmed" | "strong" | "probable";
type ReliabilityLevel = "official" | "mapped" | "strong" | "probable";

const PERIODS = [
  {label: "6 h", hours: 6, days: 2},
  {label: "12 h", hours: 12, days: 2},
  {label: "24 h", hours: 24, days: 2},
  {label: "48 h", hours: 48, days: 3},
  {label: "7 j", hours: 168, days: 8},
  {label: "14 j", hours: 336, days: 15},
  {label: "30 j", hours: 720, days: 31},
];

const FIRE_FILTERS: ReadonlyArray<{value: FireFilter; label: string}> = [
  {value: "all", label: "Tous"},
  {value: "confirmed", label: "Confirmé"},
  {value: "strong", label: "Forte présomption"},
  {value: "probable", label: "Probable"},
];
const MAX_SIDEBAR_EVENTS = 40;
const VERIFICATION_BATCH_SIZE = 100;
const MARKER_COLORS: Record<ReliabilityLevel, string> = {
  probable: "#f7b955",
  strong: "#ff6b35",
  mapped: "#b7d48b",
  official: "#edf4e5",
};
const RELIABILITY_PRIORITY: Record<ReliabilityLevel, number> = {probable: 0, strong: 1, mapped: 2, official: 3};

const REGION_NAMES: Record<string, string> = {
  "11": "Île-de-France",
  "24": "Centre-Val de Loire",
  "27": "Bourgogne-Franche-Comté",
  "28": "Normandie",
  "32": "Hauts-de-France",
  "44": "Grand Est",
  "52": "Pays de la Loire",
  "53": "Bretagne",
  "75": "Nouvelle-Aquitaine",
  "76": "Occitanie",
  "84": "Auvergne-Rhône-Alpes",
  "93": "Provence-Alpes-Côte d’Azur",
  "94": "Corse",
};

function project([longitude, latitude]: Position): Position {
  return projectFirePosition(longitude, latitude);
}

function ringToPath(ring: Position[]) {
  return `${ring.map((position, index) => {
    const [x, y] = project(position);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ")} Z`;
}

function featurePath(feature: DepartmentFeature) {
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates.map(ringToPath).join(" ");
  return feature.geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).join(" ");
}

function satellitePassCount(detections: Detection[]) {
  const times = detections.map((detection) => new Date(detection.acquiredAt).getTime()).sort((a, b) => a - b);
  return times.reduce((passes, time) => {
    const previous = passes.at(-1);
    return previous === undefined || time - previous >= 45 * 60_000 ? [...passes, time] : passes;
  }, [] as number[]).length;
}

function reliability(event: ObservedEvent, verification?: Verification) {
  if (verification?.level === "official") {
    const published = verification.publishedAt ? ` · publiée le ${formatDate(verification.publishedAt)}` : "";
    return {level: "official", label: "Confirmé officiellement", detail: `Publication de ${verification.sourceName ?? "l’autorité compétente"}${published}`};
  }
  if (verification?.level === "mapped") {
    const area = verification.areaHa ? ` · ${verification.areaHa.toLocaleString("fr-FR")} ha cartographiés` : "";
    const observed = verification.observedAt ? ` · observé le ${formatDate(verification.observedAt)}` : "";
    return {level: "mapped", label: "Zone brûlée cartographiée", detail: `Périmètre EFFIS recoupant les coordonnées${area}${observed}`};
  }
  const passes = satellitePassCount(event.detections);
  const strong = passes >= 2 && event.maxFrp >= 20;
  return strong
    ? {level: "strong", label: "Forte présomption", detail: `${passes} passages satellites distincts · intensité ≥ 20 MW`}
    : {level: "probable", label: "Probable", detail: "Plusieurs mesures convergentes sur un même passage"};
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
}

function formatDate(value: string, withDate = true) {
  return new Intl.DateTimeFormat("fr-FR", {
    ...(withDate ? {day: "2-digit", month: "short"} : {}),
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function elapsed(value: string, referenceTime: number) {
  const minutes = Math.max(0, Math.round((referenceTime - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.floor(minutes / 60)} h`;
  return `il y a ${Math.floor(minutes / 1440)} j`;
}

function confidenceLabel(value: string) {
  return ({h: "haute", n: "nominale", l: "faible"} as Record<string, string>)[value.toLowerCase()] ?? value;
}

function formatImageRange(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("fr-FR", {day: "2-digit", month: "short", timeZone: "UTC"});
  return from === to
    ? formatter.format(new Date(`${from}T12:00:00Z`))
    : `${formatter.format(new Date(`${from}T12:00:00Z`))} au ${formatter.format(new Date(`${to}T12:00:00Z`))}`;
}

function Icon({name}: {name: "layers" | "search" | "info" | "play" | "pause" | "refresh"}) {
  const icons = {layers: "◫", search: "⌕", info: "i", play: "▶", pause: "Ⅱ", refresh: "↻"};
  return <span aria-hidden="true">{icons[name]}</span>;
}

function LoadingBar({label, compact = false}: {label: string; compact?: boolean}) {
  return <div className={`watch-loading-bar${compact ? " is-compact" : ""}`} role="status" aria-live="polite">
    <span>{label}</span><i><b /></i>
  </div>;
}

export function FireObservatory() {
  const imageryDialogRef = useRef<HTMLDialogElement>(null);
  const eventButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [imageryDialogOpen, setImageryDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<DepartmentFeature[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [response, setResponse] = useState<FireResponse | null>(null);
  const [error, setError] = useState<FireError | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodIndex, setPeriodIndex] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fireFilter, setFireFilter] = useState<FireFilter>("all");
  const [mapView, setMapView] = useState<MapView>(FULL_MAP_VIEW);
  const [locations, setLocations] = useState<Record<string, LocationInfo | null>>({});
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [imagery, setImagery] = useState<LatestImagery | null>(null);
  const [imageryUnavailableId, setImageryUnavailableId] = useState<string | null>(null);
  const [loadedImageryUrl, setLoadedImageryUrl] = useState<string | null>(null);
  const [imageryRenderErrorId, setImageryRenderErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (!imageryDialogOpen) return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [imageryDialogOpen]);

  const openImageryDialog = () => {
    const dialog = imageryDialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setImageryDialogOpen(true);
  };

  useEffect(() => {
    void fetch("/data/departements-1000m.geojson")
      .then((result) => result.json() as Promise<DepartmentCollection>)
      .then((data) => setDepartments(data.features))
      .catch(() => setDepartments([]))
      .finally(() => setDepartmentsLoading(false));
  }, []);

  const loadFires = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetch(`/api/fires?days=${days}`, {cache: "no-store"});
      const body = await result.json() as FireResponse | FireError;
      if (!result.ok || "error" in body) {
        setError(body as FireError);
        setResponse(null);
      } else setResponse(body as FireResponse);
    } catch {
      setError({error: "source_unavailable", message: "Impossible de joindre le connecteur de données."});
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFires(PERIODS[periodIndex].days), 0);
    return () => window.clearTimeout(timer);
  }, [loadFires, periodIndex]);

  const filteredDetections = useMemo(() => {
    if (!response) return [];
    const cutoff = new Date(response.fetchedAt).getTime() - PERIODS[periodIndex].hours * 3_600_000;
    return response.detections.filter((detection) =>
      new Date(detection.acquiredAt).getTime() >= cutoff &&
      pointIsInFrance(detection.longitude, detection.latitude, {features: departments} as BoundaryCollection),
    );
  }, [departments, periodIndex, response]);
  const events = useMemo(() => clusterDetections(filteredDetections).filter(isProbableFire), [filteredDetections]);
  const filteredEvents = useMemo(() => events.filter((event) => {
    const level = reliability(event, verifications[event.id]).level;
    if (fireFilter === "confirmed") return level === "official" || level === "mapped";
    return fireFilter === "all" || level === fireFilter;
  }), [events, fireFilter, verifications]);
  const filteredFireDetections = useMemo(() => filteredEvents.flatMap((event) => event.detections), [filteredEvents]);
  const bounds = useMemo(() => {
    const times = filteredFireDetections.map((item) => new Date(item.acquiredAt).getTime());
    return {min: Math.min(...times), max: Math.max(...times)};
  }, [filteredFireDetections]);
  const referenceTime = response ? new Date(response.fetchedAt).getTime() : 0;
  const timelineCutoff = Number.isFinite(bounds.min) ? bounds.min + ((bounds.max - bounds.min) * timeline / 5) : referenceTime;
  const timelineEvents = useMemo(() => filteredEvents.filter((event) =>
    event.detections.some((item) => new Date(item.acquiredAt).getTime() <= timelineCutoff),
  ), [filteredEvents, timelineCutoff]);
  const mapVisibleEvents = useMemo(() => timelineEvents.filter((event) => eventIsInMapView(event, mapView)), [mapView, timelineEvents]);
  const mapClusters = useMemo(() => clusterEventsForMap(mapVisibleEvents, mapView), [mapView, mapVisibleEvents]);
  const sidebarEvents = useMemo(() => mapVisibleEvents.slice(0, MAX_SIDEBAR_EVENTS), [mapVisibleEvents]);
  const selected = mapVisibleEvents.find((event) => event.id === selectedId) ?? mapVisibleEvents[0] ?? null;
  const selectedVisible = selected?.detections.filter((item) => new Date(item.acquiredAt).getTime() <= timelineCutoff) ?? [];
  const latestDetection = selectedVisible.at(-1) ?? selected?.detections[0] ?? null;
  const timelineTimes = Array.from({length: 6}, (_, index) => Number.isFinite(bounds.min)
    ? new Date(bounds.min + ((bounds.max - bounds.min) * index / 5)).toISOString()
    : new Date().toISOString());

  useEffect(() => {
    const pendingEvents = sidebarEvents.filter((event) => locations[event.id] === undefined);
    if (!pendingEvents.length) return;
    const controller = new AbortController();
    const eventIds = pendingEvents.map((event) => event.id);
    void fetch("/api/locations", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({locations: pendingEvents.map((event) => ({id: event.id, latitude: event.latitude, longitude: event.longitude}))}),
      signal: controller.signal,
    })
      .then((result) => result.json() as Promise<{locations: Record<string, LocationInfo | null>}>)
      .then((result) => setLocations((current) => ({...current, ...result.locations})))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLocations((current) => ({...current, ...Object.fromEntries(eventIds.map((id) => [id, null]))}));
      });
    return () => controller.abort();
  }, [locations, sidebarEvents]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTimeline((value) => value >= 5 ? 0 : value + 1), 900);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const resolveImage = async () => {
      const query = new URLSearchParams({
        lat: selected.latitude.toFixed(5),
        lon: selected.longitude.toFixed(5),
        resolve: "1",
      });
      const result = await fetch(`/api/satellite?${query}`, {signal: controller.signal});
      if (!result.ok) throw new Error("No usable imagery");
      return result.json() as Promise<ImageryChoice>;
    };
    void resolveImage().then((image) => {
      setImagery({eventId: selected.id, image});
      setImageryUnavailableId(null);
      setImageryRenderErrorId(null);
    }).catch(() => setImageryUnavailableId(selected.id));
    return () => controller.abort();
  }, [selected]);

  useEffect(() => {
    const pendingEvents = events.filter((event) => verifications[event.id] === undefined);
    if (!pendingEvents.length) return;
    const controller = new AbortController();
    const batches = Array.from({length: Math.ceil(pendingEvents.length / VERIFICATION_BATCH_SIZE)}, (_, index) =>
      pendingEvents.slice(index * VERIFICATION_BATCH_SIZE, (index + 1) * VERIFICATION_BATCH_SIZE),
    );
    void Promise.all(batches.map(async (batch) => {
      const response = await fetch("/api/fire-verification", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({fires: batch.map((event) => ({
          id: event.id,
          latitude: event.latitude,
          longitude: event.longitude,
          observedAt: event.lastAt,
        }))}),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Fire verification unavailable");
      return response.json() as Promise<{verifications: Record<string, Verification>}>;
    }))
      .then((results) => setVerifications((current) => ({
        ...current,
        ...Object.assign({}, ...results.map((result) => result.verifications)),
      })))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setVerifications((current) => ({
          ...current,
          ...Object.fromEntries(pendingEvents.map((event) => [event.id, {level: null, effisStatus: "unavailable"}])),
        }));
      });
    return () => controller.abort();
  }, [events, verifications]);

  useEffect(() => {
    if (!selectedId) return;
    eventButtonRefs.current.get(selectedId)?.scrollIntoView({block: "nearest"});
  }, [selectedId]);

  const selectedImagery = selected && imagery?.eventId === selected.id ? imagery : null;
  const satelliteUrl = (choice: ImageryChoice) => selected
    ? `/api/satellite?lat=${selected.latitude.toFixed(5)}&lon=${selected.longitude.toFixed(5)}&from=${choice.from}&to=${choice.to}`
    : "";
  const selectedImageryUrl = selectedImagery ? satelliteUrl(selectedImagery.image) : null;
  const selectedImageryLoaded = Boolean(selectedImageryUrl && loadedImageryUrl === selectedImageryUrl);
  const locationLabel = (event: ObservedEvent) => {
    const remote = locations[event.id];
    if (remote === undefined) return {title: "Recherche du lieu…", parents: "Analyse des coordonnées"};
    if (remote) {
      const parents = [remote.locality, remote.commune, remote.department, remote.region]
        .filter((value): value is string => Boolean(value) && value !== remote.title)
        .filter((value, index, values) => values.indexOf(value) === index);
      return {title: remote.title, parents: parents.join(" · ") || `Zone ${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`};
    }
    const department = departments.find((feature) => pointIsInBoundaryFeature(event.longitude, event.latitude, feature));
    const region = department?.properties.region ? REGION_NAMES[department.properties.region] : null;
    return {
      title: department?.properties.nom ?? region ?? "Lieu non déterminé",
      parents: [region, `Zone ${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`].filter(Boolean).join(" · "),
    };
  };
  const selectedLabel = selected ? locationLabel(selected) : null;
  const selectedVerification = selected ? verifications[selected.id] : undefined;
  const selectedReliability = selected ? reliability(selected, selectedVerification) : null;
  const visibleEvents = sidebarEvents.filter((event) => {
    const query = normalizeSearch(searchQuery);
    if (!query) return true;
    const label = locationLabel(event);
    return normalizeSearch(`${label.title} ${label.parents} ${event.latitude.toFixed(2)} ${event.longitude.toFixed(2)}`).includes(query);
  });
  const markerScale = mapView.width / FULL_MAP_VIEW.width;
  const zoomLevel = Math.round(FULL_MAP_VIEW.width / mapView.width * 10) / 10;
  const clusterLevel = (cluster: MapCluster) => cluster.events.reduce<ReliabilityLevel>((best, event) => {
    const level = reliability(event, verifications[event.id]).level as ReliabilityLevel;
    return RELIABILITY_PRIORITY[level] > RELIABILITY_PRIORITY[best] ? level : best;
  }, "probable");
  const selectCluster = (cluster: MapCluster) => {
    if (cluster.events.length === 1 || mapView.width <= MIN_MAP_VIEW_WIDTH) {
      setSelectedId(cluster.events[0].id);
      return;
    }
    setMapView((current) => zoomMapView(current, 0.52, cluster.x, cluster.y));
    setSelectedId(null);
  };
  const resetMapAndFilters = () => {
    setMapView({...FULL_MAP_VIEW});
    setPeriodIndex(2);
    setFireFilter("all");
    setSearchQuery("");
    setTimeline(5);
    setPlaying(false);
    setSelectedId(null);
  };

  return (
    <main className="watch-app">
      <header className="watch-header">
        <Brand />
        <div className="watch-title-block"><span className="watch-live-dot" /><div><strong>VEILLE FEU</strong><small>OBSERVATOIRE SATELLITE</small></div></div>
        <nav aria-label="Navigation de l’outil"><a href="#methode">Méthode</a></nav>
        <div className="watch-freshness"><span>Dernière synchronisation</span><strong>{response ? formatDate(response.fetchedAt, false) : "–"}</strong></div>
      </header>

      <section className="watch-workspace" aria-label="Observatoire satellite des feux">
        <aside className="watch-sidebar">
          <div className="watch-search"><Icon name="search" /><input aria-label="Rechercher dans les feux probables" placeholder="Village, commune, département…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
          <div className="watch-fire-filters" role="group" aria-label="Filtrer les feux par niveau de fiabilité">
            {FIRE_FILTERS.map((filter) => <button key={filter.value} type="button" className={fireFilter === filter.value ? "is-active" : ""} aria-pressed={fireFilter === filter.value} onClick={() => {setFireFilter(filter.value); setTimeline(5); setPlaying(false);}}>{filter.label}</button>)}
          </div>
          <div className="watch-sidebar-head"><div><span>FOYERS DANS LA CARTE</span><strong>{searchQuery ? visibleEvents.length : mapVisibleEvents.length}</strong></div><button type="button" className="watch-refresh-button" aria-label="Actualiser la liste des feux" title="Actualiser la liste" disabled={loading} onClick={() => void loadFires(PERIODS[periodIndex].days)}><Icon name="refresh" /></button></div>
          <div className="watch-event-list">
            {loading && <div className="watch-list-loading"><LoadingBar label="Actualisation des feux" compact /></div>}
            {visibleEvents.map((event) => {
              const label = locationLabel(event);
              const evidence = reliability(event, verifications[event.id]);
              return <button key={event.id} ref={(node) => {if (node) eventButtonRefs.current.set(event.id, node); else eventButtonRefs.current.delete(event.id);}} type="button" className={selected?.id === event.id ? "is-active" : ""} onClick={() => setSelectedId(event.id)}>
                <span className={`watch-event-signal is-${evidence.level}`} />
                {locations[event.id] === undefined
                  ? <span className="watch-location-loading"><i /><i /><em>Identification du lieu…</em></span>
                  : <span><strong>{label.title}</strong><small>{label.parents}</small><em>Observé {elapsed(event.lastAt, referenceTime)}</em></span>}
                <time><span className={`watch-reliability is-${evidence.level}`}>{evidence.label}</span><small>{event.detections.length} observations</small></time>
              </button>;
            })}
            {!loading && !error && visibleEvents.length === 0 && <div className="watch-empty-list">{searchQuery ? "Aucun des foyers listés ne correspond à cette recherche." : fireFilter === "all" ? "Aucun feu probable sur cette période." : "Aucun feu dans ce niveau de fiabilité."}</div>}
            {mapVisibleEvents.length > MAX_SIDEBAR_EVENTS && <div className="watch-list-limit">Les {MAX_SIDEBAR_EVENTS} foyers les plus récents sont listés{searchQuery ? " et parcourus par la recherche" : ""}. Zoomez sur la carte pour affiner.</div>}
          </div>
          <div className="watch-source-mini"><span>COUCHE ACTIVE</span><strong>Feux probables repérés par satellite</strong><small>Au moins 2 observations convergentes · NASA FIRMS VIIRS</small></div>
        </aside>

        <div className="watch-map-panel">
          <div className="watch-map-tools">
            <div className="watch-periods" aria-label="Période affichée">{PERIODS.map((period, index) => <button className={periodIndex === index ? "is-active" : ""} type="button" key={period.label} onClick={() => {setPeriodIndex(index); setTimeline(5);}}>{period.label}</button>)}</div>
            <button type="button" onClick={() => void loadFires(PERIODS[periodIndex].days)}><Icon name="refresh" /> Actualiser</button>
          </div>
          <div className="watch-map-navigation" role="group" aria-label="Navigation de la carte">
            <button type="button" disabled={mapView.width >= FULL_MAP_VIEW.width} aria-label="Dézoomer" onClick={() => setMapView((current) => zoomMapView(current, 1.8))}>−</button>
            <span>{zoomLevel.toLocaleString("fr-FR")}×</span>
            <button type="button" disabled={mapView.width <= MIN_MAP_VIEW_WIDTH} aria-label="Zoomer" onClick={() => setMapView((current) => zoomMapView(current, 0.56))}>+</button>
            <button type="button" className="watch-map-reset" onClick={resetMapAndFilters}>Réinitialiser</button>
          </div>

          <svg className="watch-map" viewBox={`${mapView.x} ${mapView.y} ${mapView.width} ${mapView.height}`} role="img" aria-label="Carte des foyers thermiques regroupés en France">
            <defs><filter id="watch-glow" x="-250%" y="-250%" width="600%" height="600%"><feGaussianBlur stdDeviation={5 * markerScale} /></filter><pattern id="watch-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1" /></pattern></defs>
            <rect width="650" height="620" fill="url(#watch-grid)" />
            <g className="watch-departments">{departments.map((feature) => <path key={feature.properties.code} d={featurePath(feature)}><title>{feature.properties.nom}</title></path>)}</g>
            <g className="watch-detections">{mapClusters.map((cluster) => {
              const isCluster = cluster.events.length > 1;
              const isSelected = cluster.events.some((event) => event.id === selected?.id);
              const level = clusterLevel(cluster);
              const markerColor = MARKER_COLORS[level];
              const label = isCluster
                ? mapView.width > MIN_MAP_VIEW_WIDTH ? `${cluster.events.length} foyers proches, zoomer` : `${cluster.events.length} foyers proches dans la liste`
                : `Foyer ${reliability(cluster.events[0], verifications[cluster.events[0].id]).label}`;
              return <g key={cluster.id} role="button" tabIndex={0} aria-label={label} className={`${isSelected ? "is-selected" : ""}${isCluster ? " is-cluster" : ""}`} onClick={() => selectCluster(cluster)} onKeyDown={(event) => {if (event.key === "Enter" || event.key === " ") {event.preventDefault(); selectCluster(cluster);}}}>
                <circle className="watch-marker-hit" cx={cluster.x} cy={cluster.y} r={22 * markerScale} />
                {isCluster ? <>
                  <circle className="watch-marker-glow" cx={cluster.x} cy={cluster.y} r={17 * markerScale} fill={markerColor} />
                  <circle className="watch-cluster-ring" cx={cluster.x} cy={cluster.y} r={13 * markerScale} fill={markerColor} vectorEffect="non-scaling-stroke" />
                  <text className="watch-cluster-count" x={cluster.x} y={cluster.y} fontSize={8 * markerScale}>{cluster.events.length}</text>
                </> : <>
                  <circle className="watch-marker-glow" cx={cluster.x} cy={cluster.y} r={(isSelected ? 17 : 11) * markerScale} fill={markerColor} />
                  <circle className="watch-marker-ring" cx={cluster.x} cy={cluster.y} r={(isSelected ? 10 : 7) * markerScale} vectorEffect="non-scaling-stroke" />
                  <circle className="watch-marker-core" cx={cluster.x} cy={cluster.y} r={(isSelected ? 4 : 3) * markerScale} fill={markerColor} vectorEffect="non-scaling-stroke" />
                </>}
                <title>{label}</title>
              </g>;
            })}</g>
          </svg>

          <div className="watch-map-label"><span>ZONE VISIBLE</span><strong>{mapVisibleEvents.length} foyer{mapVisibleEvents.length > 1 ? "s" : ""} · {mapClusters.length} repère{mapClusters.length > 1 ? "s" : ""}</strong></div>
          {(loading || departmentsLoading) && <div className="watch-map-state"><LoadingBar label={loading ? "Chargement des observations FIRMS" : "Chargement du fond géographique"} /></div>}
          {!loading && error && <div className="watch-map-state is-error"><strong>{error.message}</strong><span>{error.error === "missing_key" ? "Ajoute NASA_FIRMS_MAP_KEY dans .env.local puis redémarre le serveur." : "Vérifie la configuration ou réessaie dans quelques minutes."}</span><button type="button" onClick={() => void loadFires(PERIODS[periodIndex].days)}>Réessayer</button></div>}
          {!loading && !error && filteredEvents.length === 0 && <div className="watch-map-state"><strong>{fireFilter === "all" ? "Aucun feu probable détecté" : "Aucun feu dans ce filtre"}</strong><span>{fireFilter === "all" ? "Le filtre strict peut ignorer un feu récent ou de faible intensité avant une seconde observation." : "Choisissez un autre niveau de fiabilité ou une période plus longue."}</span></div>}
          {!loading && !error && filteredEvents.length > 0 && mapVisibleEvents.length === 0 && <div className="watch-map-state"><strong>Aucun foyer dans cette zone</strong><span>Dézoomez ou réinitialisez la carte pour retrouver les autres foyers.</span><button type="button" onClick={resetMapAndFilters}>Réinitialiser</button></div>}
          <div className="watch-legend"><span><i className="probable" /> Probable</span><span><i className="strong" /> Forte présomption</span><span><i className="mapped" /> Zone cartographiée</span><span><i className="official" /> Confirmé</span></div>

          <div className="watch-timeline">
            <button type="button" className="watch-play" disabled={!filteredFireDetections.length} aria-label={playing ? "Mettre en pause" : "Lire la chronologie"} onClick={() => setPlaying((value) => !value)}><Icon name={playing ? "pause" : "play"} /></button>
            <div className="watch-timeline-main"><div><span>ÉVOLUTION DES OBSERVATIONS</span><strong>{filteredFireDetections.length ? formatDate(timelineTimes[timeline]) : "Aucune donnée"}</strong></div><input aria-label="Heure observée" type="range" min="0" max="5" value={timeline} disabled={!filteredFireDetections.length} onChange={(event) => setTimeline(Number(event.target.value))} /><div className="watch-ticks">{timelineTimes.map((time, index) => <span key={`${time}-${index}`} className={index <= timeline ? "is-past" : ""}>{formatDate(time, false)}</span>)}</div></div>
          </div>
        </div>

        <aside className="watch-detail">
          <div className="watch-detail-head"><span>{selectedReliability?.label.toLocaleUpperCase("fr-FR") ?? "FEU PROBABLE"}</span><button type="button" aria-label="Informations"><Icon name="info" /></button></div>
          {selected && latestDetection ? <>
            {locations[selected.id] === undefined
              ? <div className="watch-detail-location-loading"><LoadingBar label="Identification du lieu" compact /></div>
              : <><h1>{selectedLabel?.title}</h1><p>{selectedLabel?.parents}{selectedLabel?.parents.includes("Zone") ? "" : ` · Zone ${selected.latitude.toFixed(2)}, ${selected.longitude.toFixed(2)}`}</p></>}
            <div className={`watch-status is-${selectedReliability?.level}`}><i /><span><strong>{selectedReliability?.label} · dernière détection {elapsed(selected.lastAt, referenceTime)}</strong><small>{selectedReliability?.detail}. Ce statut n’indique pas si le feu est actif ou éteint.</small>{selectedVerification === undefined && <LoadingBar label="Vérification des sources externes" compact />}{selectedVerification?.sourceUrl && <a href={selectedVerification.sourceUrl} target="_blank" rel="noreferrer">Voir la source · {selectedVerification.sourceName}</a>}{selectedVerification?.effisStatus === "unavailable" && <em>Vérification EFFIS temporairement indisponible</em>}</span></div>
            <dl className="watch-metrics"><div><dt>Première observation</dt><dd>{formatDate(selected.firstAt)}</dd></div><div><dt>Dernière observation</dt><dd>{formatDate(selected.lastAt)}</dd></div><div><dt>Observations affichées</dt><dd>{selectedVisible.length} <small>sur {selected.detections.length}</small></dd></div><div><dt>Intensité thermique max.</dt><dd>{selected.maxFrp.toLocaleString("fr-FR")} <small>MW</small></dd></div></dl>
            <div className="watch-confidence"><span>Mesure satellite {latestDetection.satellite} · {latestDetection.daynight === "D" ? "de jour" : "de nuit"}</span><strong>confiance {confidenceLabel(latestDetection.confidence)}</strong></div>
          </> : <div className="watch-detail-empty">Sélectionnez une période contenant des observations pour afficher leur détail.</div>}

          {selected && <section className="watch-compare">
            <div className="watch-compare-head"><div><span>DERNIÈRE VUE DISPONIBLE</span><strong>Image satellite sans nuages</strong></div><div className="watch-compare-actions"><span className="watch-imagery-badge">{selectedImagery ? "Sentinel-2 · 10 m" : "Recherche…"}</span>{selectedImagery && <button type="button" className="watch-expand-button" onClick={openImageryDialog}>Agrandir</button>}</div></div>
            {selectedImagery && selectedImageryUrl && imageryRenderErrorId !== selected.id ? <div className="watch-satellite">
              <Image fill unoptimized sizes="(max-width: 1100px) 50vw, 350px" src={selectedImageryUrl} alt={`Vue Sentinel-2 récente autour de ${selectedLabel?.title ?? "la zone observée"}`} className={selectedImageryLoaded ? "is-loaded" : ""} onLoad={() => setLoadedImageryUrl(selectedImageryUrl)} onError={() => setImageryRenderErrorId(selected.id)} />
              {!selectedImageryLoaded && <div className="watch-imagery-progress"><LoadingBar label="Chargement de l’image satellite" /></div>}
              {selectedImageryLoaded && <span className="after">ACQUISITION · {formatImageRange(selectedImagery.image.date, selectedImagery.image.date)}</span>}
            </div> : imageryUnavailableId === selected.id || imageryRenderErrorId === selected.id
              ? <div className="watch-imagery-loading"><strong>Aucune image exploitable récente</strong><span>Sentinel-2 n’a pas fourni de pixels suffisamment dégagés sur cette zone.</span></div>
              : <div className="watch-imagery-loading"><LoadingBar label="Recherche de la dernière image exploitable" /></div>}
            <small>{selectedImagery ? `Copernicus Sentinel-2 L2A · composite récent de pixels non nuageux · dernière acquisition : ${selectedImagery.image.cloudCoverage.toLocaleString("fr-FR")} % de nuages sur la tuile.` : "Recherche des acquisitions Sentinel-2 récentes."}</small>
          </section>}
          <p className="watch-warning"><Icon name="info" /> Feu probable signifie que plusieurs observations thermiques fiables convergent. Seuls les services de secours peuvent confirmer un incendie.</p>
        </aside>
      </section>

      <dialog ref={imageryDialogRef} className="watch-imagery-dialog" onClose={() => setImageryDialogOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget) imageryDialogRef.current?.close();
      }}>
        <div className="watch-imagery-dialog-shell">
          <header>
            <div><span>DERNIÈRE VUE SATELLITE</span><strong>{selectedLabel?.title ?? "Observation satellite"}</strong><small>{selectedLabel?.parents}</small></div>
            <button type="button" onClick={() => imageryDialogRef.current?.close()}>Fermer</button>
          </header>
          {selectedImagery && selectedImageryUrl && <div className="watch-satellite watch-satellite-expanded">
            <Image fill unoptimized sizes="100vw" src={selectedImageryUrl} alt={`Vue Sentinel-2 récente autour de ${selectedLabel?.title ?? "la zone observée"}`} className={selectedImageryLoaded ? "is-loaded" : ""} onLoad={() => setLoadedImageryUrl(selectedImageryUrl)} />
            {!selectedImageryLoaded && <div className="watch-imagery-progress"><LoadingBar label="Chargement de l’image satellite" /></div>}
            {selectedImageryLoaded && <span className="after">ACQUISITION · {formatImageRange(selectedImagery.image.date, selectedImagery.image.date)}</span>}
          </div>}
          <footer>Dernière vue Sentinel-2 exploitable · Échap pour fermer</footer>
        </div>
      </dialog>

      <section className="watch-method" id="methode"><span>DONNÉES & MÉTHODE</span><h2>Observer vite.<br />Rester précis.</h2><div><p>« Probable » exige au moins deux mesures convergentes, une intensité minimale de 10 MW et une confiance nominale ou haute. « Forte présomption » exige en plus deux passages satellites espacés d’au moins 45 minutes et une intensité de 20 MW.</p><p>« Zone brûlée cartographiée » recoupe le signal avec un périmètre EFFIS. « Confirmé officiellement » exige une alerte FR-Alert réelle, observée et publiée par une autorité. La vérification est appliquée à tous les foyers affichés.</p></div></section>
    </main>
  );
}
