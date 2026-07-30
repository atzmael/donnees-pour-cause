"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {Brand} from "@/components/Brand";
import {SiteFooter} from "@/components/SiteFooter";

type Metric = "burnedArea" | "fireCount" | "temperature";
type Position = [number, number];
type DepartmentFeature = {
  type: "Feature";
  properties: {code: string; nom: string; region: string};
  geometry:
    | {type: "Polygon"; coordinates: Position[][]}
    | {type: "MultiPolygon"; coordinates: Position[][][]};
};
type DepartmentCollection = {type: "FeatureCollection"; features: DepartmentFeature[]};
type NationalYear = {year: number; fireCount: number; burnedArea: number; temperature: number};

const NATIONAL_DATA: NationalYear[] = [
  {year: 2006, fireCount: 4680, burnedArea: 7850, temperature: 0.5},
  {year: 2007, fireCount: 3910, burnedArea: 6120, temperature: 0.4},
  {year: 2008, fireCount: 3520, burnedArea: 5100, temperature: 0.2},
  {year: 2009, fireCount: 4890, burnedArea: 11200, temperature: 0.7},
  {year: 2010, fireCount: 3710, burnedArea: 6400, temperature: 0.1},
  {year: 2011, fireCount: 5210, burnedArea: 12100, temperature: 1.1},
  {year: 2012, fireCount: 4420, burnedArea: 8700, temperature: 0.5},
  {year: 2013, fireCount: 3290, burnedArea: 4200, temperature: 0},
  {year: 2014, fireCount: 3180, burnedArea: 3900, temperature: 1.2},
  {year: 2015, fireCount: 5020, burnedArea: 11800, temperature: 1},
  {year: 2016, fireCount: 4780, burnedArea: 9800, temperature: 0.8},
  {year: 2017, fireCount: 6120, burnedArea: 26300, temperature: 1.4},
  {year: 2018, fireCount: 4720, burnedArea: 8900, temperature: 1.5},
  {year: 2019, fireCount: 5840, burnedArea: 15900, temperature: 1.7},
  {year: 2020, fireCount: 4650, burnedArea: 17200, temperature: 1.8},
  {year: 2021, fireCount: 3980, burnedArea: 13100, temperature: 0.8},
  {year: 2022, fireCount: 7420, burnedArea: 66200, temperature: 2.3},
  {year: 2023, fireCount: 5480, burnedArea: 22400, temperature: 2.1},
  {year: 2024, fireCount: 4310, burnedArea: 14200, temperature: 2},
  {year: 2025, fireCount: 4860, burnedArea: 18700, temperature: 2.2},
  {year: 2026, fireCount: 3180, burnedArea: 12600, temperature: 1.8},
];

const METRICS: Record<Metric, {label: string; unit: string}> = {
  burnedArea: {label: "Surface brûlée", unit: "ha"},
  fireCount: {label: "Nombre de feux", unit: "feux"},
  temperature: {label: "Anomalie de température", unit: "°C"},
};

const METROPOLITAN_CODES = new Set([
  ...Array.from({length: 19}, (_, index) => String(index + 1).padStart(2, "0")),
  "2A",
  "2B",
  ...Array.from({length: 75}, (_, index) => String(index + 21).padStart(2, "0")),
]);

function hashCode(value: string) {
  return Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function departmentValue(code: string, year: number, metric: Metric) {
  const seed = hashCode(code) * 17 + year * 23;
  const southFactor = ["06", "11", "13", "2A", "2B", "30", "34", "66", "83", "84"].includes(code)
    ? 2.5
    : 0.72 + ((seed % 31) / 48);
  const atlanticFactor = ["33", "40", "47"].includes(code) && year >= 2017 ? 2.15 : 1;
  const yearFactor = year === 2022 ? 2.7 : year === 2017 ? 1.7 : 0.75 + ((year - 2006) / 42);

  if (metric === "temperature") {
    const national = NATIONAL_DATA.find((item) => item.year === year)?.temperature ?? 0;
    return Math.max(-0.2, national + ((seed % 15) - 7) / 20);
  }
  if (metric === "fireCount") {
    return Math.round((22 + (seed % 92)) * southFactor * atlanticFactor * yearFactor);
  }
  return Math.round((35 + (seed % 620)) * southFactor * atlanticFactor * yearFactor);
}

function formatValue(value: number, metric: Metric) {
  if (metric === "temperature") {
    return `${value >= 0 ? "+" : ""}${value.toLocaleString("fr-FR", {maximumFractionDigits: 1})} °C`;
  }
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

function colorFor(value: number, values: number[], metric: Metric) {
  const amount = 16 + normalizedValue(value, values) * 80;
  if (metric === "temperature") {
    return `color-mix(in srgb, var(--fire-hot) ${amount}%, var(--fire-cool))`;
  }
  return `color-mix(in srgb, var(--fire-burn) ${amount}%, var(--fire-map-low))`;
}

function MiniTimeline({metric, selectedYear, onSelect}: {
  metric: Metric;
  selectedYear: number;
  onSelect: (year: number) => void;
}) {
  const width = 920;
  const height = 88;
  const values = NATIONAL_DATA.map((item) => item[metric]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const x = (index: number) => 16 + (index / (NATIONAL_DATA.length - 1)) * 886;
  const y = (value: number) => 12 + (1 - (value - minimum) / Math.max(1, maximum - minimum)) * 59;
  const points = NATIONAL_DATA.map((item, index) => `${x(index)},${y(item[metric])}`).join(" ");
  const selected = NATIONAL_DATA.find((item) => item.year === selectedYear) ?? NATIONAL_DATA[0];

  return (
    <div className="fire-timeline-row">
      <div className="fire-timeline-label">
        <strong>{METRICS[metric].label}</strong>
        <span>{formatValue(selected[metric], metric)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${METRICS[metric].label}, de 2006 à 2026`}>
        <line x1="16" x2="902" y1="71" y2="71" />
        <polyline points={points} />
        {NATIONAL_DATA.map((item, index) => (
          <circle
            key={item.year}
            cx={x(index)}
            cy={y(item[metric])}
            r={item.year === selectedYear ? 6.5 : 4}
            className={item.year === selectedYear ? "is-selected" : ""}
            onClick={() => onSelect(item.year)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(item.year);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${item.year} : ${formatValue(item[metric], metric)}`}
          />
        ))}
        <text x="16" y="87">2006</text>
        <text x="902" y="87" textAnchor="end">2026</text>
      </svg>
    </div>
  );
}

export function ForestFiresDataviz() {
  const [year, setYear] = useState(2026);
  const [metric, setMetric] = useState<Metric>("burnedArea");
  const [features, setFeatures] = useState<DepartmentFeature[]>([]);
  const [selectedCode, setSelectedCode] = useState("33");

  useEffect(() => {
    let active = true;
    fetch("/data/departements-1000m.geojson")
      .then((response) => response.json() as Promise<DepartmentCollection>)
      .then((collection) => {
        if (active) {
          setFeatures(collection.features.filter((feature) => METROPOLITAN_CODES.has(feature.properties.code)));
        }
      })
      .catch(() => {
        if (active) setFeatures([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedNational =
    NATIONAL_DATA.find((item) => item.year === year) ?? NATIONAL_DATA[NATIONAL_DATA.length - 1];
  const departmentRows = useMemo(
    () => features.map((feature) => ({
      code: feature.properties.code,
      name: feature.properties.nom,
      value: departmentValue(feature.properties.code, year, metric),
    })).sort((a, b) => b.value - a.value),
    [features, metric, year],
  );
  const metricValues = departmentRows.map((row) => row.value);
  const heroValues = features.map((feature) =>
    departmentValue(feature.properties.code, 2026, "burnedArea"),
  );
  const selectedDepartment =
    departmentRows.find((row) => row.code === selectedCode) ?? departmentRows[0];
  const selectedRank = departmentRows.findIndex((row) => row.code === selectedDepartment?.code) + 1;

  return (
    <main className="fire-story">
      <header className="story-header fire-header">
        <Brand />
        <Link className="back-link" href="/">← Tous les projets</Link>
        <span>Dataviz · Cartographie · Prototype</span>
      </header>

      <section className="fire-hero">
        <div className="fire-hero-copy">
          <p className="kicker">FEUX DE FORÊT · FRANCE MÉTROPOLITAINE · 2006—2026</p>
          <h1>Quand<br />la France<br /><em>prend feu</em></h1>
          <p className="fire-deck">
            Vingt et une années d’incendies mises en regard des températures pour comprendre
            où les feux se concentrent — et pourquoi certaines saisons laissent une trace hors norme.
          </p>
          <div className="fire-demo-note">
            <span>Premier jet</span>
            Les valeurs sont des données de démonstration. L’année 2026 est provisoire
            et devra toujours être accompagnée de sa date d’arrêté.
          </div>
        </div>
        <div className="fire-hero-map" aria-hidden="true">
          <div className="fire-hero-rings" />
          {features.length ? (
            <svg viewBox="0 0 650 620">
              {features.map((feature) => {
                const value = departmentValue(feature.properties.code, 2026, "burnedArea");
                return (
                  <path
                    key={feature.properties.code}
                    d={featurePath(feature)}
                    fill={colorFor(value, heroValues, "burnedArea")}
                  />
                );
              })}
            </svg>
          ) : (
            <div className="fire-map-loading">Chargement de la carte…</div>
          )}
          <p><strong>2026</strong><span>Surface brûlée · données provisoires</span></p>
        </div>
        <a href="#carte" className="fire-scroll-link">Explorer la carte ↓</a>
      </section>

      <section className="fire-explorer" id="carte" aria-labelledby="fire-map-title">
        <div className="fire-explorer-head">
          <div>
            <p className="kicker">01 · LE TERRITOIRE</p>
            <h2 id="fire-map-title">La géographie des feux</h2>
          </div>
          <div className="fire-year-control">
            <button type="button" onClick={() => setYear(Math.max(2006, year - 1))} disabled={year === 2006} aria-label="Année précédente">←</button>
            <strong>{year}</strong>
            <button type="button" onClick={() => setYear(Math.min(2026, year + 1))} disabled={year === 2026} aria-label="Année suivante">→</button>
          </div>
        </div>

        <div className="fire-metric-tabs" aria-label="Indicateur cartographique">
          {(Object.keys(METRICS) as Metric[]).map((key) => (
            <button key={key} type="button" className={metric === key ? "is-selected" : ""}
              aria-pressed={metric === key} onClick={() => setMetric(key)}>
              {METRICS[key].label}
            </button>
          ))}
        </div>

        <div className="fire-map-layout">
          <div className="fire-map-wrap">
            {features.length ? (
              <svg viewBox="0 0 650 620" role="img" aria-label={`Carte de ${METRICS[metric].label.toLowerCase()} par département en ${year}`}>
                {features.map((feature) => {
                  const value = departmentValue(feature.properties.code, year, metric);
                  const selected = selectedDepartment?.code === feature.properties.code;
                  return (
                    <path key={feature.properties.code} d={featurePath(feature)}
                      fill={colorFor(value, metricValues, metric)}
                      className={selected ? "is-selected" : ""}
                      onClick={() => setSelectedCode(feature.properties.code)}
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
              </svg>
            ) : (
              <div className="fire-map-loading">Chargement du fond de carte…</div>
            )}
            <div className="fire-legend"><span>Moins</span><i /><span>Plus</span></div>
          </div>

          <aside className="fire-map-aside" aria-live="polite">
            <p className="kicker">FRANCE · {year}</p>
            {year === 2026 && <span className="fire-provisional">Année en cours · données provisoires</span>}
            <strong className="fire-national-value">{formatValue(selectedNational[metric], metric)}</strong>
            <span className="fire-national-label">{METRICS[metric].label} au niveau national</span>

            {selectedDepartment && (
              <div className="fire-department-focus">
                <span>Département sélectionné</span>
                <h3>{selectedDepartment.name}</h3>
                <strong>{formatValue(selectedDepartment.value, metric)}</strong>
                <p>{selectedRank}<sup>e</sup> département sur {departmentRows.length} pour cet indicateur.</p>
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
          </aside>
        </div>
      </section>

      <section className="fire-national" id="chronologie">
        <div className="fire-section-heading">
          <p className="kicker">02 · LE TEMPS</p>
          <h2>Une saison ne ressemble<br />jamais tout à fait à une autre.</h2>
          <p>
            Les surfaces brûlées varient beaucoup plus brutalement que le nombre de départs.
            Sélectionnez une année pour la situer dans l’ensemble de la période.
          </p>
        </div>
        <div className="fire-timelines">
          <MiniTimeline metric="fireCount" selectedYear={year} onSelect={setYear} />
          <MiniTimeline metric="burnedArea" selectedYear={year} onSelect={setYear} />
          <MiniTimeline metric="temperature" selectedYear={year} onSelect={setYear} />
        </div>
      </section>

      <section className="fire-local">
        <div className="fire-section-heading">
          <p className="kicker">03 · LE RECUL</p>
          <h2>Comparer sans conclure trop vite.</h2>
        </div>
        <div className="fire-local-grid">
          <p>
            Une année chaude n’est pas automatiquement une année de grands incendies.
            Vent, sécheresse, végétation, usages du sol et interventions humaines façonnent
            également chaque épisode.
          </p>
          <blockquote>
            La mise en regard montre des évolutions communes. Elle ne suffit pas,
            à elle seule, à établir une relation de cause à effet.
          </blockquote>
        </div>
      </section>

      <section className="fire-method">
        <p className="kicker">SOURCES & MÉTHODE</p>
        <div>
          <h2>Une première structure,<br />avant les données définitives.</h2>
          <p>
            Le prototype simule le croisement de la Base de données sur les incendies
            de forêt en France (BDIFF) avec les températures de la réanalyse ERA5.
            Le prochain lot remplacera ces valeurs de démonstration par des données
            contrôlées, documentera les millésimes et publiera les transformations.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
