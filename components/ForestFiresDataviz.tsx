"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {Brand} from "@/components/Brand";
import {SiteFooter} from "@/components/SiteFooter";

type Metric = "burnedArea" | "fireCount" | "heatwaveDays";
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
  heatwaveDays: number;
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
  heatwaveSource: string;
  years: Record<string, FireYearData>;
};

const FALLBACK_EARLIEST_YEAR = 2006;

const METRICS: Record<Metric, {label: string; unit: string; description: string}> = {
  burnedArea: {
    label: "Surface brûlée",
    unit: "ha",
    description: "Surface totale parcourue par les incendies recensés pendant l’année, exprimée en hectares.",
  },
  fireCount: {
    label: "Nombre de feux",
    unit: "feux",
    description: "Nombre total d’incendies recensés pendant l’année, quelle que soit leur surface.",
  },
  heatwaveDays: {
    label: "Jours de canicule",
    unit: "jours",
    description: "Nombre national de jours appartenant à une vague de chaleur selon Météo-France. La mise en regard avec les incendies montre une corrélation, pas une causalité.",
  },
};

const METROPOLITAN_CODES = new Set([
  ...Array.from({length: 19}, (_, index) => String(index + 1).padStart(2, "0")),
  "2A",
  "2B",
  ...Array.from({length: 75}, (_, index) => String(index + 21).padStart(2, "0")),
]);

function departmentValue(yearData: FireYearData | undefined, code: string, metric: Metric) {
  if (!yearData || metric === "heatwaveDays") return 0;
  return yearData.departments[code]?.[metric] ?? 0;
}

function formatValue(value: number, metric: Metric) {
  return `${Math.round(value).toLocaleString("fr-FR")} ${METRICS[metric].unit}`;
}

function AnimatedMetricValue({value, metric}: {value: number | null; metric: Metric}) {
  const valueRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = valueRef.current;
    if (!element || value === null) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = formatValue(value, metric);
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([gsapModule, scrollTriggerModule]) => {
        if (disposed || !valueRef.current) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        const counter = {value: 0};
        gsap.registerPlugin(ScrollTrigger);
        const tween = gsap.to(counter, {
          value,
          duration: 1.15,
          ease: "power2.out",
          paused: true,
          onStart: () => {
            if (valueRef.current) valueRef.current.textContent = formatValue(0, metric);
          },
          onUpdate: () => {
            if (valueRef.current) valueRef.current.textContent = formatValue(counter.value, metric);
          },
          onComplete: () => {
            if (valueRef.current) valueRef.current.textContent = formatValue(value, metric);
          },
        });
        const trigger = ScrollTrigger.create({
          trigger: valueRef.current,
          start: "top 92%",
          once: true,
          onEnter: () => tween.restart(),
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
  }, [metric, value]);

  return (
    <strong ref={valueRef}>
      {value === null ? "Pas de données" : formatValue(value, metric)}
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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [metric, setMetric] = useState<Metric>("burnedArea");
  const [view, setView] = useState<ViewMode>("map");
  const [features, setFeatures] = useState<DepartmentFeature[]>([]);
  const [dataset, setDataset] = useState<FireDataset | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hoveredEvolutionYear, setHoveredEvolutionYear] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/departements-1000m.geojson").then((response) => response.json() as Promise<DepartmentCollection>),
      fetch("/data/forest-fires.json").then((response) => response.json() as Promise<FireDataset>),
    ])
      .then(([collection, fireDataset]) => {
        if (active) {
          setFeatures(collection.features.filter((feature) => METROPOLITAN_CODES.has(feature.properties.code)));
          setDataset(fireDataset);
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
  const evolutionMetrics: Metric[] = ["burnedArea", "fireCount", "heatwaveDays"];
  const comparisonYear = hoveredEvolutionYear ?? year;
  const comparisonData = dataset?.years[String(comparisonYear)];
  const evolutionPoints = (key: Metric) => {
    const availableYears = timelineYears.filter(
      (item) => !(key === "fireCount" && item.source === "EFFIS"),
    );
    const values = availableYears.map((item) => item[key]);
    const maximum = Math.max(...values, 1);
    return availableYears.map((item) => ({
      ...item,
      x: 30 + ((item.year - earliestAvailableYear) / Math.max(1, currentYear - earliestAvailableYear)) * 920,
      y: 128 - (item[key] / maximum) * 98,
    }));
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
      : parsed.toLocaleDateString("fr-FR", {dateStyle: "long"});
  };

  return (
    <main className="fire-story">
      <header className="story-header fire-header">
        <Brand />
        <Link className="back-link" href="/">← Tous les projets</Link>
        <span>Dataviz · Cartographie · Prototype</span>
      </header>

      <section className="fire-opening" id="carte" aria-labelledby="fire-title">
        <div className="fire-opening-copy">
          <p className="kicker">FEUX DE FORÊT · FRANCE MÉTROPOLITAINE · {earliestAvailableYear}—{currentYear}</p>
          <h1 id="fire-title">Quand la France <em>prend feu</em></h1>
          <p className="fire-deck">
            <strong className="fire-inline-number">{currentYear - earliestAvailableYear + 1}</strong> années d’incendies cartographiées pour comprendre
            où les feux se concentrent — et pourquoi certaines saisons laissent une trace hors norme.
          </p>
        </div>

        <div className="fire-overview" aria-label={`Données nationales pour ${year}`}>
          <div className="fire-overview-year">
            <span>Année observée</span>
            <div className="fire-year-control">
              <button type="button" onClick={() => selectYear(Math.max(earliestAvailableYear, year - 1))} disabled={year === earliestAvailableYear} aria-label="Année précédente">←</button>
              <strong>{year}</strong>
              <button type="button" onClick={() => selectYear(Math.min(currentYear, year + 1))} disabled={year === currentYear} aria-label="Année suivante">→</button>
            </div>
            {year === currentYear && <small>{hasDataForYear ? "EFFIS · Provisoire" : "Données insuffisantes"}</small>}
          </div>
          {(Object.keys(METRICS) as Metric[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`fire-overview-stat ${metric === key ? "is-selected" : ""}`}
              aria-pressed={metric === key}
              aria-describedby={`fire-metric-help-${key}`}
              onClick={() => {
                setMetric(key);
                if (key === "heatwaveDays") setView("evolution");
              }}
              disabled={
                !selectedNational
                || (key === "fireCount" && selectedNational.source === "EFFIS")
              }
            >
              <span className="fire-metric-label">
                {METRICS[key].label}
                <i aria-hidden="true">?</i>
              </span>
              <AnimatedMetricValue
                metric={key}
                value={
                  !selectedNational || (key === "fireCount" && selectedNational.source === "EFFIS")
                    ? null
                    : selectedNational[key]
                }
              />
              <span
                className="fire-metric-tooltip"
                id={`fire-metric-help-${key}`}
                role="tooltip"
              >
                {METRICS[key].description}
              </span>
            </button>
          ))}
        </div>
        <p className="fire-freshness">
          <i aria-hidden="true" />
          {metric === "heatwaveDays"
            ? `Météo-France · vagues de chaleur nationales ${year === currentYear ? "provisoires" : "observées"}`
            : selectedNational
              ? `${selectedNational.source} · ${selectedNational.status === "provisional" ? "données provisoires" : "données consolidées"}`
              : "Données indisponibles"}
          {selectedNational?.source === "EFFIS" && dataset?.effisCutoffAt
            ? ` · données arrêtées au ${formatEffisCutoff(dataset.effisCutoffAt)}`
            : dataset && ` · import du ${new Date(dataset.updatedAt).toLocaleString("fr-FR", {dateStyle: "long", timeStyle: "short"})}`}
        </p>

        <div className="fire-view-tabs" role="tablist" aria-label="Vue de la dataviz">
          <button
            id="fire-tab-map"
            type="button"
            role="tab"
            aria-controls="fire-panel-map"
            aria-selected={view === "map"}
            className={view === "map" ? "is-selected" : ""}
            onClick={() => {
              if (metric === "heatwaveDays") setMetric("burnedArea");
              setView("map");
            }}
          >
            Carte
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
            Évolution
          </button>
        </div>

        {view === "map" ? (
          <div className="fire-map-layout" id="fire-panel-map" role="tabpanel" aria-labelledby="fire-tab-map">
          <div className="fire-map-wrap">
            {!hasDataForYear ? (
              <div className="fire-year-unavailable" role="status">
                <strong>{year}</strong>
                <p>Nous n’avons pas encore assez de données pour l’année {year}, merci de sélectionner une année antérieure.</p>
                <button type="button" onClick={() => selectYear(latestAvailableYear)}>
                  Voir {latestAvailableYear}
                </button>
              </div>
            ) : features.length ? (
              <svg viewBox="0 0 650 620" role="img" aria-label={`Carte de ${METRICS[metric].label.toLowerCase()} par département en ${year}`}>
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
                      <title>{feature.properties.nom} — {formatValue(value, metric)}</title>
                    </path>
                  );
                })}
                <g className="fire-map-outlines" aria-hidden="true">
                  {selectedFeature && (
                    <path
                      className="is-selected"
                      d={featurePath(selectedFeature)}
                      fill="none"
                    />
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
              <div className="fire-map-loading">Chargement du fond de carte…</div>
            )}
            {hasDataForYear && <div className="fire-legend"><span>Moins</span><i /><span>Plus</span></div>}
          </div>

          <aside className="fire-map-aside">
            <label className="fire-department-picker" htmlFor="fire-department-select">
              <span>Choisir un département</span>
              <select
                id="fire-department-select"
                value={selectedCode ?? ""}
                onChange={(event) => setSelectedCode(event.target.value || null)}
              >
                <option value="">Sélectionner…</option>
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
                <span>Département sélectionné</span>
                <h3>{selectedDepartment.name}</h3>
                <strong>{formatValue(selectedDepartment.value, metric)}</strong>
                <p>{selectedRank}<sup>e</sup> département sur {departmentRows.length} pour cet indicateur.</p>
              </div>
            ) : (
              <div className="fire-empty-detail">
                <span>Détail départemental</span>
                <p>Sélectionnez un département sur la carte pour voir le détail.</p>
              </div>
            )}

            <div className="fire-ranking">
              <span>Les plus touchés</span>
              <ol>
                {departmentRows.slice(0, 5).map((row) => (
                  <li key={row.code}>
                    <button type="button" onClick={() => setSelectedCode(row.code)}>
                      <span>{row.name}</span>
                      <strong>{formatValue(row.value, metric)}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="fire-demo-note">
              <span>{selectedNational?.source ?? "Source"}</span>
              {selectedNational?.status === "provisional"
                ? "Estimation satellitaire provisoire EFFIS, susceptible d’évoluer avec les nouveaux périmètres détectés."
                : "Incendies consolidés par la Base de données sur les incendies de forêt en France."}
            </div>
          </aside>
          </div>
        ) : (
          <div className="fire-evolution" id="fire-panel-evolution" role="tabpanel" aria-labelledby="fire-tab-evolution">
            <div className="fire-evolution-head">
              <div>
                <span>Évolution nationale</span>
                <strong>{earliestAvailableYear}—{currentYear}</strong>
              </div>
              <div>
                <p>
                  Chaque courbe utilise sa propre échelle. Survolez-les pour comparer
                  une même année, ou utilisez le curseur au clavier et sur mobile.
                </p>
                <label className="fire-evolution-scrubber" htmlFor="fire-evolution-year">
                  <span>Année comparée</span>
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
              <span>Lecture synchronisée · {comparisonYear}</span>
              {evolutionMetrics.map((key) => (
                <strong key={key}>
                  {METRICS[key].label}{" "}
                  <em>
                    {key === "fireCount" && comparisonData?.source === "EFFIS"
                      ? "Pas de données"
                      : comparisonData
                        ? formatValue(comparisonData[key], key)
                        : "Pas de données"}
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
                      <span>{METRICS[key].label}</span>
                      <strong>
                        {selectedPoint ? formatValue(selectedPoint[key], key) : "Pas de données"}
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
                          <title>{point.year} — {formatValue(point[key], key)}</title>
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
        <p className="kicker">SOURCES & MÉTHODE</p>
        <div>
          <h2>Une première structure,<br />avec des données traçables.</h2>
          <p>
            Les années 2006 à {dataset?.latestConsolidatedYear ?? currentYear - 1} sont calculées
            depuis les incendies publiés par la BDIFF. L’année {currentYear} repose sur les
            périmètres satellitaires EFFIS disponibles au moment de la mise à jour.
            Les deux sources n’ont pas le même niveau de consolidation : cette rupture est
            indiquée directement dans l’interface. Les jours de canicule correspondent aux
            vagues de chaleur nationales identifiées par Météo-France ; leur rapprochement
            avec les incendies décrit une corrélation et non un lien de causalité.
          </p>
          <ul className="fire-source-links">
            <li>
              <a href="https://bdiff.agriculture.gouv.fr/incendies/zip" target="_blank" rel="noreferrer">
                BDIFF — incendies consolidés 2006–2025, export CSV ↗
              </a>
            </li>
            <li>
              <a href="https://forest-fire.emergency.copernicus.eu/applications/data-and-services" target="_blank" rel="noreferrer">
                EFFIS — périmètres satellitaires provisoires 2026 ↗
              </a>
            </li>
            <li>
              <a href="https://indicateurs-snbc.developpement-durable.gouv.fr/duree-et-severite-des-vagues-de-chaleur-a8.html?lang=fr" target="_blank" rel="noreferrer">
                Météo-France / Ministère de la Transition écologique — série 2006–2019 ↗
              </a>
            </li>
            <li>
              <a href="https://education.meteofrance.fr/le-changement-climatique/quel-climat-futur/changement-climatique-quel-impact-sur-les-vagues-de" target="_blank" rel="noreferrer">
                Météo-France — recensement des vagues de chaleur 2020–2026 ↗
              </a>
            </li>
            <li>
              <a href="/data/heatwave-days.json" target="_blank" rel="noreferrer">
                Série utilisée — valeurs et liens officiels année par année ↗
              </a>
            </li>
            <li>
              <a href="https://geoservices.ign.fr/adminexpress#telechargement" target="_blank" rel="noreferrer">
                IGN ADMIN EXPRESS — limites départementales ↗
              </a>
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
