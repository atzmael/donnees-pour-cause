"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Brand} from "@/components/Brand";
import {pointIsInBoundaryFeature, pointIsInFrance, type BoundaryCollection} from "@/lib/france-boundary";

type Position = [number, number];
type DepartmentFeature = {
  type: "Feature";
  properties: {code: string; nom: string; region?: string};
  geometry: {type: "Polygon"; coordinates: Position[][]} | {type: "MultiPolygon"; coordinates: Position[][][]};
};
type DepartmentCollection = {type: "FeatureCollection"; features: DepartmentFeature[]};
type Detection = {
  latitude: number;
  longitude: number;
  acquiredAt: string;
  satellite: string;
  instrument: string;
  confidence: string;
  frp: number;
  daynight: string;
};
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
type ObservedEvent = {
  id: string;
  latitude: number;
  longitude: number;
  detections: Detection[];
  firstAt: string;
  lastAt: string;
  maxFrp: number;
};

const PERIODS = [
  {label: "6 h", hours: 6, days: 1},
  {label: "12 h", hours: 12, days: 1},
  {label: "24 h", hours: 24, days: 1},
  {label: "48 h", hours: 48, days: 2},
  {label: "5 j", hours: 120, days: 5},
];

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
  return [((longitude + 5.6) / 15.4) * 620 + 12, ((51.3 - latitude) / 10.4) * 590 + 8];
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

function distanceKm(a: Detection, b: {latitude: number; longitude: number}) {
  const earthRadius = 6371;
  const latitudeDelta = (b.latitude - a.latitude) * Math.PI / 180;
  const longitudeDelta = (b.longitude - a.longitude) * Math.PI / 180;
  const latitudeA = a.latitude * Math.PI / 180;
  const latitudeB = b.latitude * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function clusterDetections(detections: Detection[]): ObservedEvent[] {
  const events: ObservedEvent[] = [];
  [...detections].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt)).forEach((detection) => {
    const event = events.find((candidate) =>
      distanceKm(detection, candidate) <= 18 &&
      Math.abs(new Date(detection.acquiredAt).getTime() - new Date(candidate.lastAt).getTime()) <= 36 * 3_600_000,
    );
    if (!event) {
      events.push({
        id: `${detection.latitude.toFixed(2)}-${detection.longitude.toFixed(2)}-${detection.acquiredAt.slice(0, 10)}`,
        latitude: detection.latitude,
        longitude: detection.longitude,
        detections: [detection],
        firstAt: detection.acquiredAt,
        lastAt: detection.acquiredAt,
        maxFrp: detection.frp,
      });
      return;
    }
    event.detections.push(detection);
    event.latitude = event.detections.reduce((sum, item) => sum + item.latitude, 0) / event.detections.length;
    event.longitude = event.detections.reduce((sum, item) => sum + item.longitude, 0) / event.detections.length;
    event.lastAt = detection.acquiredAt;
    event.maxFrp = Math.max(event.maxFrp, detection.frp);
  });
  return events.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function isProbableFire(event: ObservedEvent) {
  const hasReliableMeasurement = event.detections.some((detection) => ["n", "h"].includes(detection.confidence.toLowerCase()));
  return event.detections.length >= 2 && event.maxFrp >= 10 && hasReliableMeasurement;
}

function satellitePassCount(detections: Detection[]) {
  const times = detections.map((detection) => new Date(detection.acquiredAt).getTime()).sort((a, b) => a - b);
  return times.reduce((passes, time) => {
    const previous = passes.at(-1);
    return previous === undefined || time - previous >= 45 * 60_000 ? [...passes, time] : passes;
  }, [] as number[]).length;
}

function reliability(event: ObservedEvent) {
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

export function FireObservatory() {
  const imageryDialogRef = useRef<HTMLDialogElement>(null);
  const [departments, setDepartments] = useState<DepartmentFeature[]>([]);
  const [response, setResponse] = useState<FireResponse | null>(null);
  const [error, setError] = useState<FireError | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodIndex, setPeriodIndex] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locations, setLocations] = useState<Record<string, LocationInfo | null>>({});
  const [imagery, setImagery] = useState<LatestImagery | null>(null);
  const [imageryUnavailableId, setImageryUnavailableId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/data/departements-1000m.geojson")
      .then((result) => result.json() as Promise<DepartmentCollection>)
      .then((data) => setDepartments(data.features))
      .catch(() => setDepartments([]));
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
  const probableDetections = useMemo(() => events.flatMap((event) => event.detections), [events]);
  const selected = events.find((event) => event.id === selectedId) ?? events[0] ?? null;

  useEffect(() => {
    if (!events.length) return;
    const controller = new AbortController();
    void fetch("/api/locations", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({locations: events.map((event) => ({id: event.id, latitude: event.latitude, longitude: event.longitude}))}),
      signal: controller.signal,
    })
      .then((result) => result.json() as Promise<{locations: Record<string, LocationInfo | null>}>)
      .then((result) => setLocations(result.locations))
      .catch(() => undefined);
    return () => controller.abort();
  }, [events]);

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
    }).catch(() => setImageryUnavailableId(selected.id));
    return () => controller.abort();
  }, [selected]);

  const bounds = useMemo(() => {
    const times = probableDetections.map((item) => new Date(item.acquiredAt).getTime());
    return {min: Math.min(...times), max: Math.max(...times)};
  }, [probableDetections]);
  const referenceTime = response ? new Date(response.fetchedAt).getTime() : 0;
  const timelineCutoff = Number.isFinite(bounds.min) ? bounds.min + ((bounds.max - bounds.min) * timeline / 5) : referenceTime;
  const visibleDetections = probableDetections.filter((item) => new Date(item.acquiredAt).getTime() <= timelineCutoff);
  const selectedVisible = selected?.detections.filter((item) => new Date(item.acquiredAt).getTime() <= timelineCutoff) ?? [];
  const latestDetection = selectedVisible.at(-1) ?? selected?.detections[0] ?? null;
  const timelineTimes = Array.from({length: 6}, (_, index) => Number.isFinite(bounds.min)
    ? new Date(bounds.min + ((bounds.max - bounds.min) * index / 5)).toISOString()
    : new Date().toISOString());
  const selectedImagery = selected && imagery?.eventId === selected.id ? imagery : null;
  const satelliteUrl = (choice: ImageryChoice) => selected
    ? `/api/satellite?lat=${selected.latitude.toFixed(5)}&lon=${selected.longitude.toFixed(5)}&from=${choice.from}&to=${choice.to}`
    : "";
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
  const visibleEvents = events.filter((event) => {
    const query = normalizeSearch(searchQuery);
    if (!query) return true;
    const label = locationLabel(event);
    return normalizeSearch(`${label.title} ${label.parents} ${event.latitude.toFixed(2)} ${event.longitude.toFixed(2)}`).includes(query);
  });

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
          <div className="watch-sidebar-head"><div><span>FEUX PROBABLES</span><strong>{visibleEvents.length}</strong></div><button type="button" aria-label="Rafraîchir" onClick={() => void loadFires(PERIODS[periodIndex].days)}><Icon name="refresh" /></button></div>
          <div className="watch-event-list">
            {visibleEvents.map((event) => {
              const label = locationLabel(event);
              const evidence = reliability(event);
              return <button key={event.id} type="button" className={selected?.id === event.id ? "is-active" : ""} onClick={() => setSelectedId(event.id)}>
                <span className={`watch-event-signal is-${evidence.level}`} />
                <span><strong>{label.title}</strong><small>{label.parents}</small><em>Observé {elapsed(event.lastAt, referenceTime)}</em></span>
                <time><span className={`watch-reliability is-${evidence.level}`}>{evidence.label}</span><small>{event.detections.length} observations</small></time>
              </button>;
            })}
            {!loading && !error && visibleEvents.length === 0 && <div className="watch-empty-list">{searchQuery ? "Aucun feu probable ne correspond à cette recherche." : "Aucun feu probable sur cette période."}</div>}
          </div>
          <div className="watch-source-mini"><span>COUCHE ACTIVE</span><strong>Feux probables repérés par satellite</strong><small>Au moins 2 observations convergentes · NASA FIRMS VIIRS</small></div>
        </aside>

        <div className="watch-map-panel">
          <div className="watch-map-tools">
            <div className="watch-periods" aria-label="Période affichée">{PERIODS.map((period, index) => <button className={periodIndex === index ? "is-active" : ""} type="button" key={period.label} onClick={() => {setPeriodIndex(index); setTimeline(5);}}>{period.label}</button>)}</div>
            <button type="button" onClick={() => void loadFires(PERIODS[periodIndex].days)}><Icon name="refresh" /> Actualiser</button>
          </div>

          <svg className="watch-map" viewBox="0 0 650 620" role="img" aria-label="Carte des détections thermiques NASA FIRMS en France">
            <defs><filter id="watch-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="8" /></filter><pattern id="watch-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1" /></pattern></defs>
            <rect width="650" height="620" fill="url(#watch-grid)" />
            <g className="watch-departments">{departments.map((feature) => <path key={feature.properties.code} d={featurePath(feature)}><title>{feature.properties.nom}</title></path>)}</g>
            <g className="watch-detections">{visibleDetections.map((detection, index) => {
              const [x, y] = project([detection.longitude, detection.latitude]);
              const event = events.find((candidate) => candidate.detections.includes(detection));
              const isSelected = event?.id === selected?.id;
              const markerColor = event && reliability(event).level === "strong" ? "#ff6b35" : "#f7b955";
              return <g key={`${detection.acquiredAt}-${detection.latitude}-${index}`} className={isSelected ? "is-selected" : ""} onClick={() => event && setSelectedId(event.id)}>
                <circle className="watch-marker-glow" cx={x} cy={y} r={isSelected ? 24 : 16} fill={markerColor} /><circle className="watch-marker-ring" cx={x} cy={y} r={isSelected ? 10 : 7} /><circle className="watch-marker-core" cx={x} cy={y} r={isSelected ? 4 : 3} fill={markerColor} />
              </g>;
            })}</g>
          </svg>

          <div className="watch-map-label"><span>FRANCE MÉTROPOLITAINE</span><strong>{events.length} feu{events.length > 1 ? "x" : ""} probable{events.length > 1 ? "s" : ""}</strong></div>
          {loading && <div className="watch-map-state"><span className="watch-spinner" />Chargement des observations FIRMS…</div>}
          {!loading && error && <div className="watch-map-state is-error"><strong>{error.message}</strong><span>{error.error === "missing_key" ? "Ajoute NASA_FIRMS_MAP_KEY dans .env.local puis redémarre le serveur." : "Vérifie la configuration ou réessaie dans quelques minutes."}</span><button type="button" onClick={() => void loadFires(PERIODS[periodIndex].days)}>Réessayer</button></div>}
          {!loading && !error && events.length === 0 && <div className="watch-map-state"><strong>Aucun feu probable détecté</strong><span>Le filtre strict peut ignorer un feu récent ou de faible intensité avant une seconde observation.</span></div>}
          <div className="watch-legend"><span><i className="probable" /> Probable</span><span><i className="strong" /> Forte présomption</span><small>Aucun niveau ne constitue une confirmation officielle.</small></div>

          <div className="watch-timeline">
            <button type="button" className="watch-play" disabled={!probableDetections.length} aria-label={playing ? "Mettre en pause" : "Lire la chronologie"} onClick={() => setPlaying((value) => !value)}><Icon name={playing ? "pause" : "play"} /></button>
            <div className="watch-timeline-main"><div><span>ÉVOLUTION DES OBSERVATIONS</span><strong>{probableDetections.length ? formatDate(timelineTimes[timeline]) : "Aucune donnée"}</strong></div><input aria-label="Heure observée" type="range" min="0" max="5" value={timeline} disabled={!probableDetections.length} onChange={(event) => setTimeline(Number(event.target.value))} /><div className="watch-ticks">{timelineTimes.map((time, index) => <span key={`${time}-${index}`} className={index <= timeline ? "is-past" : ""}>{formatDate(time, false)}</span>)}</div></div>
          </div>
        </div>

        <aside className="watch-detail">
          <div className="watch-detail-head"><span>{selected ? reliability(selected).label.toLocaleUpperCase("fr-FR") : "FEU PROBABLE"}</span><button type="button" aria-label="Informations"><Icon name="info" /></button></div>
          {selected && latestDetection ? <>
            <h1>{selectedLabel?.title}</h1><p>{selectedLabel?.parents}{selectedLabel?.parents.includes("Zone") ? "" : ` · Zone ${selected.latitude.toFixed(2)}, ${selected.longitude.toFixed(2)}`}</p>
            <div className={`watch-status is-${reliability(selected).level}`}><i /><span><strong>{reliability(selected).label} · dernière détection {elapsed(selected.lastAt, referenceTime)}</strong><small>{reliability(selected).detail}. Ce statut n’indique pas si le feu est actif ou éteint.</small></span></div>
            <dl className="watch-metrics"><div><dt>Première observation</dt><dd>{formatDate(selected.firstAt)}</dd></div><div><dt>Dernière observation</dt><dd>{formatDate(selected.lastAt)}</dd></div><div><dt>Observations affichées</dt><dd>{selectedVisible.length} <small>sur {selected.detections.length}</small></dd></div><div><dt>Intensité thermique max.</dt><dd>{selected.maxFrp.toLocaleString("fr-FR")} <small>MW</small></dd></div></dl>
            <div className="watch-confidence"><span>Mesure satellite {latestDetection.satellite} · {latestDetection.daynight === "D" ? "de jour" : "de nuit"}</span><strong>confiance {confidenceLabel(latestDetection.confidence)}</strong></div>
          </> : <div className="watch-detail-empty">Sélectionnez une période contenant des observations pour afficher leur détail.</div>}

          {selected && <section className="watch-compare">
            <div className="watch-compare-head"><div><span>DERNIÈRE VUE DISPONIBLE</span><strong>Image satellite sans nuages</strong></div><div className="watch-compare-actions"><span className="watch-imagery-badge">{selectedImagery ? "Sentinel-2 · 10 m" : "Recherche…"}</span>{selectedImagery && <button type="button" className="watch-expand-button" onClick={() => imageryDialogRef.current?.showModal()}>Agrandir</button>}</div></div>
            {selectedImagery ? <div className="watch-satellite" style={{backgroundImage: `url(${satelliteUrl(selectedImagery.image)})`}}>
              <span className="after">ACQUISITION · {formatImageRange(selectedImagery.image.date, selectedImagery.image.date)}</span>
            </div> : imageryUnavailableId === selected.id
              ? <div className="watch-imagery-loading"><strong>Aucune image exploitable récente</strong><span>Sentinel-2 n’a pas fourni de pixels suffisamment dégagés sur cette zone.</span></div>
              : <div className="watch-imagery-loading"><span className="watch-spinner" />Recherche de la dernière image exploitable…</div>}
            <small>{selectedImagery ? `Copernicus Sentinel-2 L2A · composite récent de pixels non nuageux · dernière acquisition : ${selectedImagery.image.cloudCoverage.toLocaleString("fr-FR")} % de nuages sur la tuile.` : "Recherche des acquisitions Sentinel-2 récentes."}</small>
          </section>}
          <p className="watch-warning"><Icon name="info" /> Feu probable signifie que plusieurs observations thermiques fiables convergent. Seuls les services de secours peuvent confirmer un incendie.</p>
        </aside>
      </section>

      <dialog ref={imageryDialogRef} className="watch-imagery-dialog" onClick={(event) => {
        if (event.target === event.currentTarget) imageryDialogRef.current?.close();
      }}>
        <div className="watch-imagery-dialog-shell">
          <header>
            <div><span>DERNIÈRE VUE SATELLITE</span><strong>{selectedLabel?.title ?? "Observation satellite"}</strong><small>{selectedLabel?.parents}</small></div>
            <button type="button" onClick={() => imageryDialogRef.current?.close()}>Fermer</button>
          </header>
          {selectedImagery && <div className="watch-satellite watch-satellite-expanded" style={{backgroundImage: `url(${satelliteUrl(selectedImagery.image)})`}}>
            <span className="after">ACQUISITION · {formatImageRange(selectedImagery.image.date, selectedImagery.image.date)}</span>
          </div>}
          <footer>Dernière vue Sentinel-2 exploitable · Échap pour fermer</footer>
        </div>
      </dialog>

      <section className="watch-method" id="methode"><span>DONNÉES & MÉTHODE</span><h2>Observer vite.<br />Rester précis.</h2><div><p>« Probable » exige au moins deux mesures convergentes, une intensité minimale de 10 MW et une confiance nominale ou haute. « Forte présomption » exige en plus deux passages satellites espacés d’au moins 45 minutes et une intensité de 20 MW.</p><p>Ces niveaux décrivent la solidité des indices disponibles, pas une certitude. Les futurs tags « zone brûlée cartographiée » et « confirmé officiellement » seront réservés aux données EFFIS ou aux autorités.</p></div></section>
    </main>
  );
}
