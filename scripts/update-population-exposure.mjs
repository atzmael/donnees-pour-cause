import {execFileSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import proj4 from "proj4";

proj4.defs("EPSG:3035", "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs");

const START_YEAR = 2006;
const currentYear = new Date().getFullYear();
const workspace = mkdtempSync(join(tmpdir(), "population-exposure-"));
const effisZip = join(workspace, "effis.zip");
const populationZip = join(workspace, "population.zip");
const effisDirectory = join(workspace, "effis");
const outputPath = new URL("../public/data/population-exposure.json", import.meta.url);

function curl(args) {
  execFileSync("curl", ["-L", "--fail", "--silent", "--show-error", ...args], {stdio: "inherit"});
}

function parseDbf(path) {
  const buffer = readFileSync(path);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const recordsCount = buffer.readUInt32LE(4);
  const fields = [];
  for (let offset = 32; buffer[offset] !== 0x0d; offset += 32) {
    fields.push({
      name: buffer.subarray(offset, offset + 11).toString("ascii").replace(/\0.*$/, ""),
      length: buffer[offset + 16],
    });
  }
  const records = [];
  for (let recordIndex = 0; recordIndex < recordsCount; recordIndex += 1) {
    let offset = headerLength + recordIndex * recordLength + 1;
    const record = {};
    for (const field of fields) {
      record[field.name] = new TextDecoder("latin1")
        .decode(buffer.subarray(offset, offset + field.length)).trim();
      offset += field.length;
    }
    records.push(record);
  }
  return records;
}

function parseShapefile(path) {
  const buffer = readFileSync(path);
  const shapes = [];
  for (let offset = 100; offset + 8 <= buffer.length;) {
    const contentLength = buffer.readInt32BE(offset + 4) * 2;
    const start = offset + 8;
    const shapeType = buffer.readInt32LE(start);
    if (shapeType !== 5 && shapeType !== 15 && shapeType !== 25) {
      shapes.push(null);
      offset = start + contentLength;
      continue;
    }
    const bbox = [
      buffer.readDoubleLE(start + 4), buffer.readDoubleLE(start + 12),
      buffer.readDoubleLE(start + 20), buffer.readDoubleLE(start + 28),
    ];
    const partsCount = buffer.readInt32LE(start + 36);
    const pointsCount = buffer.readInt32LE(start + 40);
    const parts = Array.from({length: partsCount}, (_, index) => buffer.readInt32LE(start + 44 + index * 4));
    const pointsStart = start + 44 + partsCount * 4;
    const points = Array.from({length: pointsCount}, (_, index) => [
      buffer.readDoubleLE(pointsStart + index * 16),
      buffer.readDoubleLE(pointsStart + index * 16 + 8),
    ]);
    const rings = parts.map((pointIndex, index) => points.slice(pointIndex, parts[index + 1] ?? points.length));
    shapes.push({bbox, rings});
    offset = start + contentLength;
  }
  return shapes;
}

function pointInShape([x, y], shape) {
  if (x < shape.bbox[0] || y < shape.bbox[1] || x > shape.bbox[2] || y > shape.bbox[3]) return false;
  let inside = false;
  for (const ring of shape.rings) {
    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
      const [currentX, currentY] = ring[current];
      const [previousX, previousY] = ring[previous];
      if (
        ((currentY > y) !== (previousY > y))
        && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX
      ) inside = !inside;
    }
  }
  return inside;
}

const bucketSize = 0.25;
const bucketKey = (longitude, latitude) => `${Math.floor(longitude / bucketSize)}:${Math.floor(latitude / bucketSize)}`;

curl([
  "--get", "https://maps.effis.emergency.copernicus.eu/effis",
  "--data-urlencode", "service=WFS",
  "--data-urlencode", "version=1.1.0",
  "--data-urlencode", "request=GetFeature",
  "--data-urlencode", "typename=ms:modis.ba.poly",
  "--data-urlencode", "outputFormat=SHAPEZIP",
  "--data-urlencode", "srsName=EPSG:4326",
  "--data-urlencode", "bbox=41.0,-5.6,51.3,10.0,EPSG:4326",
  "-o", effisZip,
]);
curl([
  "https://www.insee.fr/fr/statistiques/fichier/8272002/rp2021_carreaux_1km_csv.zip",
  "-o", populationZip,
]);
execFileSync("unzip", ["-o", effisZip, "-d", effisDirectory], {stdio: "ignore"});

const records = parseDbf(join(effisDirectory, "modis.ba.poly.dbf"));
const shapes = parseShapefile(join(effisDirectory, "modis.ba.poly.shp"));
if (records.length !== shapes.length) {
  throw new Error(`Intégrité EFFIS invalide : ${records.length} lignes DBF pour ${shapes.length} géométries SHP.`);
}
const shapesByYear = new Map();
for (let index = 0; index < records.length; index += 1) {
  const record = records[index];
  const year = Number(record.FIREDATE?.slice(0, 4));
  if (record.COUNTRY !== "FR" || year < START_YEAR || year > currentYear || !shapes[index]) continue;
  const yearShapes = shapesByYear.get(year) ?? [];
  yearShapes.push(shapes[index]);
  shapesByYear.set(year, yearShapes);
}

const bucketsByYear = new Map();
for (const [year, yearShapes] of shapesByYear) {
  const buckets = new Map();
  for (const shape of yearShapes) {
    const minX = Math.floor(shape.bbox[0] / bucketSize);
    const maxX = Math.floor(shape.bbox[2] / bucketSize);
    const minY = Math.floor(shape.bbox[1] / bucketSize);
    const maxY = Math.floor(shape.bbox[3] / bucketSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = `${x}:${y}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(shape);
        buckets.set(key, bucket);
      }
    }
  }
  bucketsByYear.set(year, buckets);
}

const populationCsv = execFileSync("unzip", ["-p", populationZip, "carreaux_1km_met.csv"], {
  encoding: "utf8",
  maxBuffer: 120 * 1024 * 1024,
});
const totals = Object.fromEntries([...shapesByYear.keys()].map((year) => [year, 0]));
let populationCells = 0;
let referencePopulation = 0;
for (const line of populationCsv.split(/\r?\n/).slice(1)) {
  const [cellId, , , populationValue] = line.split(";");
  if (!cellId || !populationValue) continue;
  const match = cellId.match(/N(\d+)E(\d+)$/);
  if (!match) continue;
  populationCells += 1;
  referencePopulation += Number(populationValue);
  const [longitude, latitude] = proj4("EPSG:3035", "EPSG:4326", [Number(match[2]) + 500, Number(match[1]) + 500]);
  const key = bucketKey(longitude, latitude);
  for (const [year, buckets] of bucketsByYear) {
    const candidates = buckets.get(key);
    if (candidates?.some((shape) => pointInShape([longitude, latitude], shape))) {
      totals[year] += Number(populationValue);
    }
  }
}
if (populationCells < 300_000 || referencePopulation < 60_000_000 || referencePopulation > 75_000_000) {
  throw new Error(`Grille Insee invalide : ${populationCells} carreaux, ${Math.round(referencePopulation)} habitants.`);
}

const documentedImpacts = {
  2019: {evacuations: 548, note: "À comparer avec 548 déplacements documentés par l’IDMC. Les déplacements couvrent des zones d’évacuation plus larges que les seules surfaces finalement brûlées."},
  2022: {evacuations: 45000, note: "À comparer avec 45 000 déplacements documentés par l’IDMC, dont 30 000 évacuations en juillet et 8 000 lors d’une reprise en août en Gironde. Ce sont des mouvements, pas nécessairement des personnes uniques, et les évacuations préventives dépassent largement les surfaces finalement brûlées."},
  2023: {evacuations: 3300, note: "À comparer avec 3 300 déplacements documentés par l’IDMC. Les déplacements couvrent des zones d’évacuation plus larges que les seules surfaces finalement brûlées."},
};
const years = Object.fromEntries(Object.entries(totals).map(([year, value]) => [year, {
  exposedPopulation: Math.round(value),
  status: Number(year) === currentYear ? "provisional" : "consolidated",
  ...(documentedImpacts[year] ? {documentedImpact: documentedImpacts[year]} : {}),
}]));

writeFileSync(outputPath, `${JSON.stringify({
  updatedAt: new Date().toISOString(),
  populationReferenceYear: 2021,
  methodology: "Estimation du nombre d’habitants dont le carreau de résidence Insee de 1 km a son centre dans un périmètre brûlé EFFIS MODIS. Un habitant n’est compté qu’une fois par année. La méthode couvre principalement les feux d’environ 30 hectares ou plus. Elle ne mesure ni l’exposition aux fumées, ni les zones évacuées préventivement, ni les victimes. Un carreau partiellement touché dont le centre est hors du périmètre n’est pas compté.",
  audit: {
    effisRecords: records.length,
    frenchPerimeters: [...shapesByYear.values()].reduce((sum, values) => sum + values.length, 0),
    populationCells,
    referencePopulation: Math.round(referencePopulation),
    coverageStartYear: Math.min(...shapesByYear.keys()),
  },
  sources: [
    {label: "EFFIS — périmètres brûlés MODIS", url: "https://forest-fire.emergency.copernicus.eu/applications/data-and-services"},
    {label: "Insee — données carroyées 2021 à 1 km", url: "https://www.insee.fr/fr/statistiques/8272002"},
    {label: "EEA — méthode d’exposition aux zones brûlées", url: "https://climate-adapt.eea.europa.eu/en/observatory/publications-data/analysis-data/exposure-to-burnt-areas"},
    {label: "IDMC — déplacements internes", url: "https://www.internal-displacement.org/database/displacement-data/"},
  ],
  years,
}, null, 2)}\n`);

console.log(`Données écrites dans ${outputPath.pathname}`);
rmSync(workspace, {recursive: true, force: true});
