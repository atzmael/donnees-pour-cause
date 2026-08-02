"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {useLocale} from "next-intl";
import {Brand} from "@/components/Brand";
import {SiteFooter} from "@/components/SiteFooter";

type Metric = "burnedArea" | "fireCount" | "populationExposure";
type ViewMode = "map" | "evolution";
type Position = [number, number];
type DepartmentFeature = {
  type: "Feature";
  properties: {code: string; nom: string; region?: string};
  geometry:
    | {type: "Polygon"; coordinates: Position[][]}
    | {type: "MultiPolygon"; coordinates: Position[][][]};
};
type DepartmentCollection = {type: "FeatureCollection"; features: DepartmentFeature[]};
type FireYearData = {
  source: "BDIFF" | "EFFIS";
  status: "consolidated" | "provisional";
  fireCount: number;
  burnedArea: number;
  forestBurnedArea: number;
  forestShare: number;
  departments: Record<string, {
    fireCount: number;
    burnedArea: number;
    forestBurnedArea: number;
    forestShare: number;
  }>;
};
type FireDataset = {
  updatedAt: string;
  effisCutoffAt: string | null;
  earliestYear: number;
  latestConsolidatedYear: number;
  currentYear: number;
  years: Record<string, FireYearData>;
};
type PopulationExposureYear = {
  exposedPopulation: number;
  status: "consolidated" | "provisional";
  documentedImpact?: {evacuations: number; note: string};
};
type PopulationExposureDataset = {
  updatedAt: string;
  populationReferenceYear: number;
  methodology: string;
  years: Record<string, PopulationExposureYear>;
};

const FALLBACK_EARLIEST_YEAR = 2006;

const COPY = {
  fr: {
    back: "← Tous les projets", meta: "Dataviz · Cartographie · Données publiques",
    kicker: "FEUX DE FORÊT · FRANCE MÉTROPOLITAINE", titleStart: "Quand la France", titleEmphasis: "prend feu",
    deck: "années d’incendies cartographiées pour comprendre où les feux se concentrent — et pourquoi certaines saisons laissent une trace hors norme.",
    observedYear: "Année observée", previousYear: "Année précédente", nextYear: "Année suivante",
    provisional: "EFFIS · Provisoire", insufficient: "Données insuffisantes", noData: "Pas de données",
    unavailable: "Données indisponibles", consolidated: "données consolidées", provisionalData: "données provisoires",
    cutoff: "données arrêtées au", importDate: "import du", exposureFreshness: "EFFIS × Insee · estimation géographique",
    observed: "observées", provisionalPlural: "provisoires", viewLabel: "Vue de la dataviz", map: "Carte", evolution: "Évolution",
    yearUnavailable: "Nous n’avons pas encore assez de données pour cette année, merci de sélectionner une année antérieure.",
    seeYear: "Voir", loading: "Chargement du fond de carte…", less: "Moins", more: "Plus",
    chooseDepartment: "Choisir un département", select: "Sélectionner…", selectedDepartment: "Département sélectionné",
    rank: "département sur {count} pour cet indicateur.", detail: "Détail départemental",
    selectDetail: "Sélectionnez un département sur la carte pour voir le détail.", mostAffected: "Les plus touchés",
    effisNote: "Estimation satellitaire provisoire EFFIS, susceptible d’évoluer avec les nouveaux périmètres détectés.",
    effisCountNote: "EFFIS publie des périmètres brûlés satellitaires, mais pas un décompte de feux directement comparable à celui de la BDIFF. Cette valeur n’est donc pas affichée pour l’année en cours.",
    bdiffNote: "Incendies consolidés par la Base de données sur les incendies de forêt en France.",
    nationalEvolution: "Évolution nationale", chartHelp: "Chaque courbe utilise sa propre échelle. Survolez-les pour comparer une même année, ou utilisez le curseur au clavier et sur mobile.",
    comparedYear: "Année comparée", synced: "Lecture synchronisée", sources: "SOURCES & MÉTHODE",
    methodTitle: "Une première structure, avec des données traçables.",
    method: "Les années 2006 à {year} sont calculées depuis les incendies publiés par la BDIFF. L’année {currentYear} repose sur les périmètres satellitaires EFFIS disponibles au moment de la mise à jour. La population potentiellement exposée croise, année par année, ces périmètres EFFIS avec la grille de population 2021 de l’Insee. Elle mesure une proximité géographique avec les zones brûlées, pas un bilan de victimes.",
    metrics: {
      burnedArea: {label: "Surface brûlée", unit: "ha", description: "Surface totale parcourue par les incendies recensés pendant l’année, exprimée en hectares."},
      fireCount: {label: "Nombre de feux", unit: "feux", description: "Nombre total d’incendies recensés pendant l’année, quelle que soit leur surface."},
      populationExposure: {label: "Population potentiellement exposée", unit: "personnes", description: "Estimation du nombre d’habitants dont le carreau de résidence Insee de 1 km a son centre dans un périmètre brûlé EFFIS. Une personne n’est comptée qu’une fois dans l’année. Il s’agit d’une exposition géographique potentielle, pas d’un nombre de victimes ou d’évacuations."},
    },
  },
  en: {
    back: "← All projects", meta: "Dataviz · Mapping · Open data",
    kicker: "WILDFIRES · METROPOLITAN FRANCE", titleStart: "When France", titleEmphasis: "catches fire",
    deck: "years of mapped wildfires reveal where fires concentrate — and why some seasons leave an exceptional mark.",
    observedYear: "Observed year", previousYear: "Previous year", nextYear: "Next year",
    provisional: "EFFIS · Provisional", insufficient: "Insufficient data", noData: "No data",
    unavailable: "Data unavailable", consolidated: "consolidated data", provisionalData: "provisional data",
    cutoff: "data through", importDate: "imported on", exposureFreshness: "EFFIS × Insee · geographic estimate",
    observed: "observed", provisionalPlural: "provisional", viewLabel: "Visualization view", map: "Map", evolution: "Trends",
    yearUnavailable: "We do not have enough data for this year yet. Please select an earlier year.",
    seeYear: "View", loading: "Loading map…", less: "Less", more: "More",
    chooseDepartment: "Choose a department", select: "Select…", selectedDepartment: "Selected department",
    rank: "department out of {count} for this indicator.", detail: "Department details",
    selectDetail: "Select a department on the map to view its details.", mostAffected: "Most affected",
    effisNote: "Provisional EFFIS satellite estimate, subject to change as new perimeters are detected.",
    effisCountNote: "EFFIS publishes satellite-derived burned perimeters, but not a fire count directly comparable with BDIFF. This value is therefore not shown for the current year.",
    bdiffNote: "Wildfires consolidated by the French forest fire database.",
    nationalEvolution: "National trends", chartHelp: "Each line uses its own scale. Hover to compare the same year, or use the slider with a keyboard or on mobile.",
    comparedYear: "Compared year", synced: "Synchronized reading", sources: "SOURCES & METHOD",
    methodTitle: "An initial framework built on traceable data.",
    method: "The years 2006 to {year} are calculated from wildfires published by BDIFF. The year {currentYear} is based on EFFIS satellite perimeters available when the data was updated. Potentially exposed population is estimated yearly by intersecting EFFIS perimeters with Insee’s 2021 population grid. It measures geographic proximity to burnt areas, not casualties.",
    metrics: {
      burnedArea: {label: "Burned area", unit: "ha", description: "Total area affected by recorded wildfires during the year, in hectares."},
      fireCount: {label: "Number of fires", unit: "fires", description: "Total number of recorded wildfires during the year, regardless of their area."},
      populationExposure: {label: "Exposed population", unit: "people", description: "Estimated residents whose 1 km Insee residential grid-cell centre lies within an EFFIS burnt perimeter. A resident is counted once per year. This is potential geographic exposure, not a casualty or evacuation count."},
    },
  },
} as const;

const METROPOLITAN_CODES = new Set([
  ...Array.from({length: 19}, (_, index) => String(index + 1).padStart(2, "0")),
  "2A",
  "2B",
  ...Array.from({length: 75}, (_, index) => String(index + 21).padStart(2, "0")),
]);

function departmentValue(yearData: FireYearData | undefined, code: string, metric: Metric) {
  if (!yearData || metric === "populationExposure") return 0;
  return yearData.departments[code]?.[metric] ?? 0;
}

function formatValue(value: number, metric: Metric, locale: "fr" | "en", metrics: typeof COPY.fr.metrics | typeof COPY.en.metrics) {
  return `${Math.round(value).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} ${metrics[metric].unit}`;
}

function formatAnimatedValue(value: number, locale: "fr" | "en", metrics: typeof COPY.fr.metrics | typeof COPY.en.metrics, metric?: Metric) {
  return metric
    ? formatValue(value, metric, locale, metrics)
    : Math.round(value).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {useGrouping: false});
}

function AnimatedNumberValue({
  value,
  startValue,
  metric,
  locale,
  metrics,
  noData,
}: {
  value: number | null;
  startValue: number;
  metric?: Metric;
  locale: "fr" | "en";
  metrics: typeof COPY.fr.metrics | typeof COPY.en.metrics;
  noData: string;
}) {
  const valueRef = useRef<HTMLElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const element = valueRef.current;
    if (!element || value === null) return;

    if (hasAnimatedRef.current) {
      element.textContent = formatAnimatedValue(value, locale, metrics, metric);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hasAnimatedRef.current = true;
      element.textContent = formatAnimatedValue(value, locale, metrics, metric);
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([gsapModule, scrollTriggerModule]) => {
        if (disposed || !valueRef.current) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        const counter = {value: startValue};
        gsap.registerPlugin(ScrollTrigger);
        const tween = gsap.to(counter, {
          value,
          duration: 1.9,
          ease: "power3.out",
          paused: true,
          onStart: () => {
            if (valueRef.current) valueRef.current.textContent = formatAnimatedValue(startValue, locale, metrics, metric);
          },
          onUpdate: () => {
            if (valueRef.current) valueRef.current.textContent = formatAnimatedValue(counter.value, locale, metrics, metric);
          },
          onComplete: () => {
            if (valueRef.current) valueRef.current.textContent = formatAnimatedValue(value, locale, metrics, metric);
          },
        });
        const trigger = ScrollTrigger.create({
          trigger: valueRef.current,
          start: "top 92%",
          once: true,
          onEnter: () => {
            hasAnimatedRef.current = true;
            tween.restart();
          },
        });
        cleanup = () => {
          trigger.kill();
          tween.kill();
        };
      },
    );

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [locale, metric, metrics, startValue, value]);

  return (
    <strong ref={valueRef}>
      {value === null ? noData : formatAnimatedValue(value, locale, metrics, metric)}
    </strong>
  );
}

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
  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates.map(ringToPath).join(" ");
  }
  return feature.geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).join(" ");
}

function normalizedValue(value: number, values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.08)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.94)] ?? 1;
  return Math.max(0, Math.min(1, (value - low) / Math.max(1, high - low)));
}

function colorFor(value: number, values: number[]) {
  const amount = 16 + normalizedValue(value, values) * 80;
  return `color-mix(in srgb, var(--fire-burn) ${amount}%, var(--fire-map-low))`;
}

export function ForestFiresDataviz() {
  const locale = useLocale() as "fr" | "en";
  const copy = COPY[locale];
  const metrics = copy.metrics;
  const formatMetricValue = (value: number, metric: Metric) => formatValue(value, metric, locale, metrics);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [metric, setMetric] = useState<Metric>("burnedArea");
  const [view, setView] = useState<ViewMode>("map");
  const [features, setFeatures] = useState<DepartmentFeature[]>([]);
  const [dataset, setDataset] = useState<FireDataset | null>(null);
  const [populationExposure, setPopulationExposure] = useState<PopulationExposureDataset | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hoveredEvolutionYear, setHoveredEvolutionYear] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/departements-1000m.geojson").then((response) => response.json() as Promise<DepartmentCollection>),
      fetch("/data/forest-fires.json").then((response) => response.json() as Promise<FireDataset>),
      fetch("/data/population-exposure.json").then((response) => response.json() as Promise<PopulationExposureDataset>),
    ])
      .then(([collection, fireDataset, populationExposureDataset]) => {
        if (active) {
          setFeatures(collection.features.filter((feature) => METROPOLITAN_CODES.has(feature.properties.code)));
          setDataset(fireDataset);
          setPopulationExposure(populationExposureDataset);
        }
      })
      .catch(() => {
        if (active) {
          setFeatures([]);
          setDataset(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const earliestAvailableYear = dataset?.earliestYear ?? FALLBACK_EARLIEST_YEAR;
  const latestAvailableYear = dataset
    ? Math.max(...Object.keys(dataset.years).map(Number))
    : currentYear;
  const selectedNational = dataset?.years[String(year)];
  const selectedExposure = populationExposure?.years[String(year)];
  const hasDataForYear = Boolean(selectedNational);
  const departmentRows = useMemo(
    () => hasDataForYear
      ? features.map((feature) => ({
        code: feature.properties.code,
        name: feature.properties.nom,
        value: departmentValue(selectedNational, feature.properties.code, metric),
      })).sort((a, b) => b.value - a.value)
      : [],
    [features, hasDataForYear, metric, selectedNational],
  );
  const metricValues = departmentRows.map((row) => row.value);
  const selectedFeature = features.find((feature) => feature.properties.code === selectedCode);
  const hoveredFeature = features.find((feature) => feature.properties.code === hoveredCode);
  const selectedDepartment = selectedCode
    ? departmentRows.find((row) => row.code === selectedCode)
    : undefined;
  const selectedRank = departmentRows.findIndex((row) => row.code === selectedDepartment?.code) + 1;
  const timelineYears = dataset
    ? Object.entries(dataset.years)
      .map(([yearKey, value]) => ({year: Number(yearKey), ...value}))
      .sort((first, second) => first.year - second.year)
    : [];
  const evolutionMetrics: Metric[] = ["burnedArea", "fireCount", "populationExposure"];
  const comparisonYear = hoveredEvolutionYear ?? year;
  const evolutionPoints = (key: Metric) => {
    const availableYears = key === "populationExposure"
      ? Object.entries(populationExposure?.years ?? {}).map(([yearKey, value]) => ({
        year: Number(yearKey), value: value.exposedPopulation,
      })).sort((first, second) => first.year - second.year)
      : timelineYears
        .filter((item) => !(key === "fireCount" && item.source === "EFFIS"))
        .map((item) => ({year: item.year, value: item[key]}));
    const values = availableYears.map((item) => item.value);
    const maximum = Math.max(...values, 1);
    return availableYears.map((item) => ({
      ...item,
      x: 30 + ((item.year - earliestAvailableYear) / Math.max(1, currentYear - earliestAvailableYear)) * 920,
      y: 128 - (item.value / maximum) * 98,
    }));
  };
  const nationalMetricValue = (key: Metric, targetYear = year): number | null => {
    if (key === "populationExposure") return populationExposure?.years[String(targetYear)]?.exposedPopulation ?? null;
    const target = dataset?.years[String(targetYear)];
    if (!target || (key === "fireCount" && target.source === "EFFIS")) return null;
    return target[key];
  };
  const selectYear = (nextYear: number) => {
    setYear(nextYear);
    if (dataset?.years[String(nextYear)]?.source === "EFFIS" && metric === "fireCount") {
      setMetric("burnedArea");
    }
    setSelectedCode(null);
    setHoveredCode(null);
  };
  const evolutionYearAtPointer = (
    event: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const nearestYear = Math.round(
      earliestAvailableYear + relativeX * (currentYear - earliestAvailableYear),
    );
    return Math.max(earliestAvailableYear, Math.min(currentYear, nearestYear));
  };
  const handleEvolutionPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    setHoveredEvolutionYear(evolutionYearAtPointer(event));
  };
  const formatEffisCutoff = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {dateStyle: "long"});
  };

  return (
    <main className="fire-story">
      <header className="story-header fire-header">
        <Brand />
        <Link className="back-link" href="/">{copy.back}</Link>
        <span>{copy.meta}</span>
      </header>

      <section className="fire-opening" id="carte" aria-labelledby="fire-title">
        <div className="fire-opening-copy">
          <p className="kicker">{copy.kicker} · {earliestAvailableYear}—{currentYear}</p>
          <h1 id="fire-title">{copy.titleStart} <em>{copy.titleEmphasis}</em></h1>
          <p className="fire-deck">
            <strong className="fire-inline-number">{currentYear - earliestAvailableYear + 1}</strong> {copy.deck}
          </p>
        </div>

        <div className="fire-overview" aria-label={`${copy.observedYear} · ${year}`}>
          <div className="fire-overview-year">
            <span>{copy.observedYear}</span>
            <div className="fire-year-control">
              <button type="button" onClick={() => selectYear(Math.max(earliestAvailableYear, year - 1))} disabled={year === earliestAvailableYear} aria-label={copy.previousYear}>←</button>
              <AnimatedNumberValue value={year} startValue={earliestAvailableYear} locale={locale} metrics={metrics} noData={copy.noData} />
              <button type="button" onClick={() => selectYear(Math.min(currentYear, year + 1))} disabled={year === currentYear} aria-label={copy.nextYear}>→</button>
            </div>
            {year === currentYear && <small>{hasDataForYear ? copy.provisional : copy.insufficient}</small>}
          </div>
          {(Object.keys(metrics) as Metric[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`fire-overview-stat ${metric === key ? "is-selected" : ""}`}
              aria-pressed={metric === key}
              aria-disabled={
                !selectedNational
                || (key === "fireCount" && selectedNational.source === "EFFIS")
                || (key === "populationExposure" && !selectedExposure)
              }
              aria-describedby={`fire-metric-help-${key}`}
              onClick={() => {
                if (
                  !selectedNational
                  || (key === "fireCount" && selectedNational.source === "EFFIS")
                  || (key === "populationExposure" && !selectedExposure)
                ) return;
                setMetric(key);
                if (key === "populationExposure") setView("evolution");
              }}
            >
              <span className="fire-metric-label">
                {metrics[key].label}
                <i aria-hidden="true">?</i>
              </span>
              <AnimatedNumberValue
                metric={key}
                value={
                  nationalMetricValue(key)
                }
                startValue={(nationalMetricValue(key) ?? 0) * 0.5}
                locale={locale}
                metrics={metrics}
                noData={copy.noData}
              />
              <span
                className="fire-metric-tooltip"
                id={`fire-metric-help-${key}`}
                role="tooltip"
              >
                {key === "fireCount" && selectedNational?.source === "EFFIS"
                  ? copy.effisCountNote
                  : key === "populationExposure" && selectedExposure?.documentedImpact
                    ? `${metrics[key].description} ${selectedExposure.documentedImpact.note}`
                    : metrics[key].description}
              </span>
            </button>
          ))}
        </div>
        <p className="fire-freshness">
          <i aria-hidden="true" />
          {metric === "populationExposure"
            ? `${copy.exposureFreshness} · ${selectedExposure ? (selectedExposure.status === "provisional" ? copy.provisionalData : copy.consolidated) : copy.noData}`
            : selectedNational
              ? `${selectedNational.source} · ${selectedNational.status === "provisional" ? copy.provisionalData : copy.consolidated}`
              : copy.unavailable}
          {selectedNational?.source === "EFFIS" && dataset?.effisCutoffAt
            ? ` · ${copy.cutoff} ${formatEffisCutoff(dataset.effisCutoffAt)}`
            : dataset && ` · ${copy.importDate} ${new Date(dataset.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {dateStyle: "long", timeStyle: "short"})}`}
        </p>

        <div className="fire-view-tabs" role="tablist" aria-label={copy.viewLabel}>
          <button
            id="fire-tab-map"
            type="button"
            role="tab"
            aria-controls="fire-panel-map"
            aria-selected={view === "map"}
            className={view === "map" ? "is-selected" : ""}
            onClick={() => {
              if (metric === "populationExposure") setMetric("burnedArea");
              setView("map");
            }}
          >
            {copy.map}
          </button>
          <button
            id="fire-tab-evolution"
            type="button"
            role="tab"
            aria-controls="fire-panel-evolution"
            aria-selected={view === "evolution"}
            className={view === "evolution" ? "is-selected" : ""}
            onClick={() => setView("evolution")}
          >
            {copy.evolution}
          </button>
        </div>

        {view === "map" ? (
          <div className="fire-map-layout" id="fire-panel-map" role="tabpanel" aria-labelledby="fire-tab-map">
          <div className="fire-map-wrap">
            {!hasDataForYear ? (
              <div className="fire-year-unavailable" role="status">
                <strong>{year}</strong>
                <p>{copy.yearUnavailable}</p>
                <button type="button" onClick={() => selectYear(latestAvailableYear)}>
                  {copy.seeYear} {latestAvailableYear}
                </button>
              </div>
            ) : features.length ? (
              <svg viewBox="0 0 650 620" role="img" aria-label={`${metrics[metric].label} · ${year}`}>
                {features.map((feature) => {
                  const value = departmentValue(selectedNational, feature.properties.code, metric);
                  const hovered = hoveredCode === feature.properties.code;
                  const selected = selectedCode === feature.properties.code;
                  const baseColor = colorFor(value, metricValues);
                  return (
                    <path key={feature.properties.code} d={featurePath(feature)}
                      fill={hovered || selected ? `color-mix(in srgb, ${baseColor} 68%, var(--fire-burn))` : baseColor}
                      onClick={() => setSelectedCode(feature.properties.code)}
                      onMouseEnter={() => setHoveredCode(feature.properties.code)}
                      onMouseLeave={() => setHoveredCode(null)}
                      aria-hidden="true"
                      tabIndex={-1}>
                      <title>{feature.properties.nom} — {formatMetricValue(value, metric)}</title>
                    </path>
                  );
                })}
                <g className="fire-map-outlines" aria-hidden="true">
                  {selectedFeature && (
                    <>
                      <path
                        className="is-selected-halo"
                        d={featurePath(selectedFeature)}
                        fill="none"
                      />
                      <path
                        className="is-selected"
                        d={featurePath(selectedFeature)}
                        fill="none"
                      />
                    </>
                  )}
                  {hoveredFeature && hoveredFeature.properties.code !== selectedFeature?.properties.code && (
                    <path
                      className="is-hovered"
                      d={featurePath(hoveredFeature)}
                      fill="none"
                    />
                  )}
                </g>
              </svg>
            ) : (
              <div className="fire-map-loading">{copy.loading}</div>
            )}
            {hasDataForYear && <div className="fire-legend"><span>{copy.less}</span><i /><span>{copy.more}</span></div>}
          </div>

          <aside className="fire-map-aside">
            <label className="fire-department-picker" htmlFor="fire-department-select">
              <span>{copy.chooseDepartment}</span>
              <select
                id="fire-department-select"
                value={selectedCode ?? ""}
                onChange={(event) => setSelectedCode(event.target.value || null)}
              >
                <option value="">{copy.select}</option>
                {[...features]
                  .sort((first, second) => first.properties.nom.localeCompare(second.properties.nom, "fr"))
                  .map((feature) => (
                    <option key={feature.properties.code} value={feature.properties.code}>
                      {feature.properties.nom}
                    </option>
                  ))}
              </select>
            </label>
            {selectedDepartment ? (
              <div className="fire-department-focus" aria-live="polite">
                <span>{copy.selectedDepartment}</span>
                <h3>{selectedDepartment.name}</h3>
                <strong>{formatMetricValue(selectedDepartment.value, metric)}</strong>
                <p>{selectedRank}<sup>{locale === "fr" ? "e" : "th"}</sup> {copy.rank.replace("{count}", String(departmentRows.length))}</p>
              </div>
            ) : (
              <div className="fire-empty-detail">
                <span>{copy.detail}</span>
                <p>{copy.selectDetail}</p>
              </div>
            )}

            <div className="fire-ranking">
              <span>{copy.mostAffected}</span>
              <ol>
                {departmentRows.slice(0, 5).map((row) => (
                  <li key={row.code}>
                    <button type="button" onClick={() => setSelectedCode(row.code)}>
                      <span>{row.name}</span>
                      <strong>{formatMetricValue(row.value, metric)}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="fire-demo-note">
              <span>{selectedNational?.source ?? "Source"}</span>
              {selectedNational?.status === "provisional"
                ? copy.effisNote
                : copy.bdiffNote}
            </div>
          </aside>
          </div>
        ) : (
          <div className="fire-evolution" id="fire-panel-evolution" role="tabpanel" aria-labelledby="fire-tab-evolution">
            <div className="fire-evolution-head">
              <div>
                <span>{copy.nationalEvolution}</span>
                <strong>{earliestAvailableYear}—{currentYear}</strong>
              </div>
              <div>
                <p>
                  {copy.chartHelp}
                </p>
                <label className="fire-evolution-scrubber" htmlFor="fire-evolution-year">
                  <span>{copy.comparedYear}</span>
                  <input
                    id="fire-evolution-year"
                    type="range"
                    min={earliestAvailableYear}
                    max={currentYear}
                    step="1"
                    value={comparisonYear}
                    onChange={(event) => selectYear(Number(event.target.value))}
                  />
                  <strong>{comparisonYear}</strong>
                </label>
              </div>
            </div>
            <div className="fire-evolution-comparison" aria-live="polite">
              <span>{copy.synced} · {comparisonYear}</span>
              {evolutionMetrics.map((key) => (
                <strong
                  key={key}
                  title={key === "populationExposure" && populationExposure?.years[String(comparisonYear)]?.documentedImpact
                    ? populationExposure.years[String(comparisonYear)].documentedImpact?.note
                    : undefined}
                >
                  {metrics[key].label}{" "}
                  <em>
                    {nationalMetricValue(key, comparisonYear) === null
                      ? copy.noData
                      : formatMetricValue(nationalMetricValue(key, comparisonYear)!, key)}
                  </em>
                </strong>
              ))}
            </div>
            <div
              className="fire-evolution-charts"
              onPointerLeave={() => setHoveredEvolutionYear(null)}
            >
              {evolutionMetrics.map((key) => {
                const points = evolutionPoints(key);
                const selectedPoint = points.find((point) => point.year === comparisonYear);
                const guideX = 30 + (
                  (comparisonYear - earliestAvailableYear)
                  / Math.max(1, currentYear - earliestAvailableYear)
                ) * 920;
                return (
                  <article key={key} className={`fire-evolution-row ${metric === key ? "is-selected" : ""}`}>
                    <button type="button" onClick={() => setMetric(key)}>
                      <span>{metrics[key].label}</span>
                      <strong>
                        {selectedPoint ? formatMetricValue(selectedPoint.value, key) : copy.noData}
                      </strong>
                    </button>
                    <svg
                      viewBox="0 0 980 155"
                      aria-hidden="true"
                      onPointerMove={handleEvolutionPointer}
                      onClick={(event) => selectYear(evolutionYearAtPointer(event))}
                    >
                      <line x1="30" y1="128" x2="950" y2="128" />
                      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
                      <line className="fire-evolution-guide" x1={guideX} y1="18" x2={guideX} y2="128" />
                      {points.map((point) => (
                        <circle
                          key={point.year}
                          className={point.year === comparisonYear ? "is-selected" : ""}
                          cx={point.x}
                          cy={point.y}
                          r={point.year === comparisonYear ? 6 : 3.5}
                        >
                          <title>{point.year} — {formatMetricValue(point.value, key)}</title>
                        </circle>
                      ))}
                      <text x="30" y="149">{earliestAvailableYear}</text>
                      <text x="950" y="149" textAnchor="end">{currentYear}</text>
                    </svg>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="fire-method">
        <p className="kicker">{copy.sources}</p>
        <div>
          <h2>{copy.methodTitle}</h2>
          <p>
            {copy.method
              .replace("{year}", String(dataset?.latestConsolidatedYear ?? currentYear - 1))
              .replace("{currentYear}", String(currentYear))}
          </p>
          <ul className="fire-source-links">
            <li>
              <a href="https://bdiff.agriculture.gouv.fr/incendies/zip" target="_blank" rel="noreferrer">
                {locale === "fr" ? "BDIFF — incendies consolidés 2006–2025, export CSV ↗" : "BDIFF — consolidated wildfires 2006–2025, CSV export ↗"}
              </a>
            </li>
            <li>
              <a href="https://forest-fire.emergency.copernicus.eu/applications/data-and-services" target="_blank" rel="noreferrer">
                {locale === "fr" ? "EFFIS — périmètres satellitaires provisoires 2026 ↗" : "EFFIS — provisional satellite perimeters 2026 ↗"}
              </a>
            </li>
            <li>
              <a href="https://www.insee.fr/fr/statistiques/8272002" target="_blank" rel="noreferrer">
                {locale === "fr" ? "Insee — grille de population 2021 à 1 km ↗" : "Insee — 2021 population grid at 1 km ↗"}
              </a>
            </li>
            <li>
              <a href="https://climate-adapt.eea.europa.eu/en/observatory/publications-data/analysis-data/exposure-to-burnt-areas" target="_blank" rel="noreferrer">
                {locale === "fr" ? "EEA — méthode européenne d’exposition aux zones brûlées ↗" : "EEA — European burnt-area exposure methodology ↗"}
              </a>
            </li>
            <li>
              <a href="https://www.internal-displacement.org/database/displacement-data/" target="_blank" rel="noreferrer">
                {locale === "fr" ? "IDMC — évacuations et déplacements documentés ↗" : "IDMC — documented evacuations and displacements ↗"}
              </a>
            </li>
            <li>
              <a href="/data/population-exposure.json" target="_blank" rel="noreferrer">
                {locale === "fr" ? "Série utilisée — valeurs, définitions et sources année par année ↗" : "Dataset used — yearly values, definitions and sources ↗"}
              </a>
            </li>
            <li>
              <a href="https://geoservices.ign.fr/adminexpress#telechargement" target="_blank" rel="noreferrer">
                {locale === "fr" ? "IGN ADMIN EXPRESS — limites départementales ↗" : "IGN ADMIN EXPRESS — department boundaries ↗"}
              </a>
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
