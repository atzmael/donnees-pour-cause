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
  const overviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/departements-detail.geojson").then((response) => response.json() as Promise<DepartmentCollection>),
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

  useEffect(() => {
    let disposed = false;
    let context: {revert: () => void} | undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([gsapModule, scrollTriggerModule]) => {
        if (disposed || !overviewRef.current) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {
          gsap.fromTo(
            "[data-animate-number]",
            {scale: 0.5, opacity: 0.45, transformOrigin: "left center"},
            {
              scale: 1,
              opacity: 1,
              duration: 0.85,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: overviewRef.current,
                start: "top 88%",
                once: true,
              },
            },
          );
        }, overviewRef);
      },
    );

    return () => {
      disposed = true;
      context?.revert();
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

        <div ref={overviewRef} className="fire-overview" aria-label={`Données nationales pour ${year}`}>
          <div className="fire-overview-year">
            <span>Année observée</span>
            <div className="fire-year-control">
              <button type="button" onClick={() => selectYear(Math.max(earliestAvailableYear, year - 1))} disabled={year === earliestAvailableYear} aria-label="Année précédente">←</button>
              <strong data-animate-number>{year}</strong>
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
              <strong data-animate-number>
                {key === "fireCount" && selectedNational?.source === "EFFIS"
                  ? "Pas de données"
                  : selectedNational
                    ? formatValue(selectedNational[key], key)
                    : "—"}
              </strong>
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
          {selectedNational
            ? `${selectedNational.source} · ${selectedNational.status === "provisional" ? "données provisoires" : "données consolidées"}`
            : "Données indisponibles"}
          {dataset && ` · mise à jour le ${new Date(dataset.updatedAt).toLocaleString("fr-FR", {dateStyle: "long", timeStyle: "short"})}`}
        </p>

        <div className="fire-view-tabs" role="tablist" aria-label="Vue de la dataviz">
          <button
            type="button"
            role="tab"
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
            type="button"
            role="tab"
            aria-selected={view === "evolution"}
            className={view === "evolution" ? "is-selected" : ""}
            onClick={() => setView("evolution")}
          >
            Évolution
          </button>
        </div>

        {view === "map" ? (
          <div className="fire-map-layout" role="tabpanel">
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
                  const baseColor = colorFor(value, metricValues);
                  return (
                    <path key={feature.properties.code} d={featurePath(feature)}
                      fill={hovered ? `color-mix(in srgb, ${baseColor} 68%, var(--fire-burn))` : baseColor}
                      onClick={() => setSelectedCode(feature.properties.code)}
                      onMouseEnter={() => setHoveredCode(feature.properties.code)}
                      onMouseLeave={() => setHoveredCode(null)}
                      onFocus={() => setHoveredCode(feature.properties.code)}
                      onBlur={() => setHoveredCode(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedCode(feature.properties.code);
                        }
                      }}
                      role="button" tabIndex={0}
                      aria-label={`${feature.properties.nom} : ${formatValue(value, metric)}`}>
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

          <aside className="fire-map-aside" aria-live="polite">
            {selectedDepartment ? (
              <div className="fire-department-focus">
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
          <div className="fire-evolution" role="tabpanel">
            <div className="fire-evolution-head">
              <div>
                <span>Évolution nationale</span>
                <strong>{earliestAvailableYear}—{currentYear}</strong>
              </div>
              <p>
                Chaque courbe utilise sa propre échelle. Sélectionnez un point pour
                reporter l’année dans la carte et les indicateurs.
              </p>
            </div>
            <div className="fire-evolution-charts">
              {evolutionMetrics.map((key) => {
                const points = evolutionPoints(key);
                const selectedPoint = points.find((point) => point.year === year);
                return (
                  <article key={key} className={`fire-evolution-row ${metric === key ? "is-selected" : ""}`}>
                    <button type="button" onClick={() => setMetric(key)}>
                      <span>{METRICS[key].label}</span>
                      <strong>
                        {selectedPoint ? formatValue(selectedPoint[key], key) : "Pas de données"}
                      </strong>
                    </button>
                    <svg viewBox="0 0 980 155" role="img" aria-label={`Évolution de ${METRICS[key].label.toLowerCase()}`}>
                      <line x1="30" y1="128" x2="950" y2="128" />
                      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
                      {points.map((point) => (
                        <circle
                          key={point.year}
                          className={point.year === year ? "is-selected" : ""}
                          cx={point.x}
                          cy={point.y}
                          r={point.year === year ? 6 : 3.5}
                          tabIndex={0}
                          role="button"
                          aria-label={`${point.year} : ${formatValue(point[key], key)}`}
                          onClick={() => selectYear(point.year)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectYear(point.year);
                            }
                          }}
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
                BDIFF — export brut des incendies de forêt ↗
              </a>
            </li>
            <li>
              <a href="https://forest-fire.emergency.copernicus.eu/applications/data-and-services" target="_blank" rel="noreferrer">
                EFFIS — surfaces brûlées mises à jour ↗
              </a>
            </li>
            <li>
              <a href="https://indicateurs-snbc.developpement-durable.gouv.fr/duree-et-severite-des-vagues-de-chaleur-a8.html?lang=fr" target="_blank" rel="noreferrer">
                Météo-France — jours cumulés de vagues de chaleur ↗
              </a>
            </li>
            <li>
              <a href="https://geoservices.ign.fr/adminexpress#telechargement" target="_blank" rel="noreferrer">
                IGN ADMIN EXPRESS — limites administratives brutes ↗
              </a>
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
