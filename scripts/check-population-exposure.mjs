import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const dataset = JSON.parse(
  readFileSync(new URL("../public/data/population-exposure.json", import.meta.url), "utf8"),
);
const years = Object.keys(dataset.years).map(Number).sort((first, second) => first - second);

assert.equal(dataset.audit.coverageStartYear, 2016, "La couverture EFFIS attendue doit commencer en 2016.");
assert.equal(years[0], dataset.audit.coverageStartYear, "La première année doit correspondre à la couverture annoncée.");
assert.equal(years.at(-1), new Date().getFullYear(), "La série doit atteindre automatiquement l’année courante.");
assert.ok(dataset.audit.effisRecords > dataset.audit.frenchPerimeters, "Le filtre France doit réduire les périmètres EFFIS.");
assert.equal(dataset.audit.populationCells, 374622, "Le nombre de carreaux Insee 2021 a changé : vérifier la source.");
assert.equal(dataset.audit.samplesPerCell, 16, "Le calcul proportionnel doit utiliser 16 échantillons par carreau.");
assert.ok(
  dataset.audit.referencePopulation > 60_000_000 && dataset.audit.referencePopulation < 75_000_000,
  "La population de référence Insee est hors de l’intervalle attendu.",
);
assert.ok(Object.values(dataset.years).every((year) => year.exposedPopulation >= 0), "Une exposition annuelle est négative.");
assert.ok(
  Object.values(dataset.years).every((year) => year.intersectedGridPopulation >= year.exposedPopulation),
  "La borne haute des carreaux touchés doit rester supérieure à l’estimation proportionnelle.",
);
assert.ok(
  dataset.years["2022"].documentedImpact.evacuations > dataset.years["2022"].exposedPopulation,
  "Le contrôle éditorial 2022 doit conserver la distinction entre évacuations et habitants des zones brûlées.",
);

console.log(`Contrôle valide : ${years.length} années, ${dataset.audit.frenchPerimeters} périmètres français.`);
