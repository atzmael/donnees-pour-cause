import {execFileSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const START_YEAR = 2006;
const currentYear = new Date().getFullYear();
const lastConsolidatedYear = currentYear - 1;
const workspace = mkdtempSync(join(tmpdir(), "forest-fire-data-"));
const outputPath = new URL("../public/data/forest-fires.json", import.meta.url);
const departmentsPath = new URL("../public/data/departements-detail.geojson", import.meta.url);
// BD Diff omits its issuing intermediate certificate. Keep verification enabled
// with the official HARICA intermediate + root bundle instead of using curl -k.
const bdiffCaPath = fileURLToPath(
  new URL("../certs/harica-geant-tls-chain.pem", import.meta.url),
);

function curl(args, {caPath} = {}) {
  execFileSync(
    "curl",
    ["-L", "--fail", "--silent", "--show-error", "--connect-timeout", "20", "--max-time", "90", ...(caPath ? ["--cacert", caPath] : []), ...args],
    {stdio: "inherit"},
  );
}

function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\"") {
      if (quoted && text[index + 1] === "\"") {
        value += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  return rows;
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function normalizeEffisDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function parseDbf(path) {
  const buffer = readFileSync(path);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const recordsCount = buffer.readUInt32LE(4);
  const fields = [];

  for (let offset = 32; buffer[offset] !== 0x0d; offset += 32) {
    const name = buffer.subarray(offset, offset + 11).toString("ascii").replace(/\0.*$/, "");
    fields.push({name, length: buffer[offset + 16]});
  }

  const records = [];
  for (let recordIndex = 0; recordIndex < recordsCount; recordIndex += 1) {
    let offset = headerLength + recordIndex * recordLength;
    if (buffer[offset] === 0x2a) continue;
    offset += 1;
    const record = {};
    for (const field of fields) {
      record[field.name] = new TextDecoder("latin1")
        .decode(buffer.subarray(offset, offset + field.length))
        .trim();
      offset += field.length;
    }
    records.push(record);
  }
  return records;
}

function emptyYear(source, status) {
  return {
    source,
    status,
    fireCount: 0,
    burnedArea: 0,
    forestBurnedArea: 0,
    forestShare: 0,
    departments: {},
  };
}

const years = {};

for (let year = START_YEAR; year <= lastConsolidatedYear; year += 1) {
  const cookiePath = join(workspace, `cookies-${year}.txt`);
  const pagePath = join(workspace, `bdiff-${year}.html`);
  const zipPath = join(workspace, `bdiff-${year}.zip`);
  curl([
    "-c", cookiePath,
    "-b", cookiePath,
    "--get",
    "--data-urlencode", `if[periodeAnnees][anneeDeb]=${year}`,
    "--data-urlencode", `if[periodeAnnees][anneeFin]=${year}`,
    "--data-urlencode", "if[zone]=13",
    "--data-urlencode", "if[submit]=",
    "https://bdiff.agriculture.gouv.fr/incendies",
    "-o", pagePath,
  ], {caPath: bdiffCaPath});
  curl([
    "-c", cookiePath,
    "-b", cookiePath,
    "https://bdiff.agriculture.gouv.fr/incendies/zip",
    "-o", zipPath,
  ], {caPath: bdiffCaPath});

  const csv = execFileSync("unzip", ["-p", zipPath, "Incendies.csv"], {encoding: "utf8"});
  const rows = parseDelimited(csv);
  const yearData = emptyYear("BDIFF", "consolidated");
  for (const row of rows) {
    if (!/^\d{4}$/.test(row[0] ?? "")) continue;
    const code = row[2]?.padStart(2, "0");
    if (!code) continue;
    const burnedArea = Number((row[6] || "0").replace(",", ".")) / 10_000;
    const forestBurnedArea = Number((row[7] || "0").replace(",", ".")) / 10_000;
    const department = yearData.departments[code] ?? {
      fireCount: 0,
      burnedArea: 0,
      forestBurnedArea: 0,
      forestShare: 0,
    };
    department.fireCount += 1;
    department.burnedArea += burnedArea;
    department.forestBurnedArea += forestBurnedArea;
    yearData.departments[code] = department;
    yearData.fireCount += 1;
    yearData.burnedArea += burnedArea;
    yearData.forestBurnedArea += forestBurnedArea;
  }
  years[year] = yearData;
}

const geojson = JSON.parse(readFileSync(departmentsPath, "utf8"));
const codeByName = new Map(
  geojson.features.map((feature) => [normalizeName(feature.properties.nom), feature.properties.code]),
);
const effisZipPath = join(workspace, "effis-france.zip");
const effisDirectory = join(workspace, "effis");
curl([
  "--get",
  "https://maps.effis.emergency.copernicus.eu/effis",
  "--data-urlencode", "service=WFS",
  "--data-urlencode", "version=1.1.0",
  "--data-urlencode", "request=GetFeature",
  "--data-urlencode", "typename=ms:modis.ba.poly",
  "--data-urlencode", "outputFormat=SHAPEZIP",
  "--data-urlencode", "srsName=EPSG:4326",
  "--data-urlencode", "bbox=41.0,-5.6,51.3,10.0,EPSG:4326",
  "-o", effisZipPath,
]);
execFileSync("unzip", ["-o", effisZipPath, "-d", effisDirectory], {stdio: "ignore"});

const currentData = emptyYear("EFFIS", "provisional");
const unmatchedProvinces = new Set();
let effisCutoffAt = null;
for (const record of parseDbf(join(effisDirectory, "modis.ba.poly.dbf"))) {
  if (record.COUNTRY !== "FR" || !record.FIREDATE.startsWith(String(currentYear))) continue;
  const recordCutoff = record.LASTUPDATE || record.FINALDATE || record.FIREDATE;
  if (recordCutoff && (!effisCutoffAt || recordCutoff > effisCutoffAt)) {
    effisCutoffAt = recordCutoff;
  }
  const code = codeByName.get(normalizeName(record.PROVINCE));
  if (!code) {
    unmatchedProvinces.add(record.PROVINCE);
    continue;
  }
  const burnedArea = Number(record.AREA_HA || 0);
  const forestLandShare = ["BROADLEA", "CONIFER", "MIXED", "SCLEROPH"]
    .reduce((sum, field) => sum + Number(record[field] || 0), 0);
  const forestBurnedArea = burnedArea * Math.min(100, forestLandShare) / 100;
  const department = currentData.departments[code] ?? {
    fireCount: 0,
    burnedArea: 0,
    forestBurnedArea: 0,
    forestShare: 0,
  };
  department.fireCount += 1;
  department.burnedArea += burnedArea;
  department.forestBurnedArea += forestBurnedArea;
  currentData.departments[code] = department;
  currentData.fireCount += 1;
  currentData.burnedArea += burnedArea;
  currentData.forestBurnedArea += forestBurnedArea;
}
years[currentYear] = currentData;

for (const yearData of Object.values(years)) {
  yearData.burnedArea = Math.round(yearData.burnedArea * 10) / 10;
  yearData.forestBurnedArea = Math.round(yearData.forestBurnedArea * 10) / 10;
  yearData.forestShare = yearData.burnedArea
    ? Math.round(yearData.forestBurnedArea / yearData.burnedArea * 1_000) / 10
    : 0;
  for (const department of Object.values(yearData.departments)) {
    department.burnedArea = Math.round(department.burnedArea * 10) / 10;
    department.forestBurnedArea = Math.round(department.forestBurnedArea * 10) / 10;
    department.forestShare = department.burnedArea
      ? Math.round(department.forestBurnedArea / department.burnedArea * 1_000) / 10
      : 0;
  }
}

writeFileSync(outputPath, `${JSON.stringify({
  updatedAt: new Date().toISOString(),
  effisCutoffAt: normalizeEffisDate(effisCutoffAt),
  earliestYear: START_YEAR,
  latestConsolidatedYear: lastConsolidatedYear,
  currentYear,
  years,
}, null, 2)}\n`);

if (unmatchedProvinces.size) {
  console.warn("Départements EFFIS non rapprochés :", [...unmatchedProvinces].join(", "));
}
console.log(`Données écrites dans ${outputPath.pathname}`);
rmSync(workspace, {recursive: true, force: true});
