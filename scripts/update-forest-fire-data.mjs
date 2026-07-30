import {execFileSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const START_YEAR = 2006;
const currentYear = new Date().getFullYear();
const lastConsolidatedYear = currentYear - 1;
const workspace = mkdtempSync(join(tmpdir(), "forest-fire-data-"));
const outputPath = new URL("../public/data/forest-fires.json", import.meta.url);
const departmentsPath = new URL("../public/data/departements-detail.geojson", import.meta.url);

function curl(args) {
  execFileSync("curl", ["-L", "--fail", "--silent", "--show-error", ...args], {stdio: "inherit"});
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
  return {source, status, fireCount: 0, burnedArea: 0, departments: {}};
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
  ]);
  curl([
    "-c", cookiePath,
    "-b", cookiePath,
    "https://bdiff.agriculture.gouv.fr/incendies/zip",
    "-o", zipPath,
  ]);

  const csv = execFileSync("unzip", ["-p", zipPath, "Incendies.csv"], {encoding: "utf8"});
  const rows = parseDelimited(csv);
  const yearData = emptyYear("BDIFF", "consolidated");
  for (const row of rows) {
    if (!/^\d{4}$/.test(row[0] ?? "")) continue;
    const code = row[2]?.padStart(2, "0");
    if (!code) continue;
    const burnedArea = Number((row[6] || "0").replace(",", ".")) / 10_000;
    const department = yearData.departments[code] ?? {fireCount: 0, burnedArea: 0};
    department.fireCount += 1;
    department.burnedArea += burnedArea;
    yearData.departments[code] = department;
    yearData.fireCount += 1;
    yearData.burnedArea += burnedArea;
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
for (const record of parseDbf(join(effisDirectory, "modis.ba.poly.dbf"))) {
  if (record.COUNTRY !== "FR" || !record.FIREDATE.startsWith(String(currentYear))) continue;
  const code = codeByName.get(normalizeName(record.PROVINCE));
  if (!code) {
    unmatchedProvinces.add(record.PROVINCE);
    continue;
  }
  const burnedArea = Number(record.AREA_HA || 0);
  const department = currentData.departments[code] ?? {fireCount: 0, burnedArea: 0};
  department.fireCount += 1;
  department.burnedArea += burnedArea;
  currentData.departments[code] = department;
  currentData.fireCount += 1;
  currentData.burnedArea += burnedArea;
}
years[currentYear] = currentData;

for (const yearData of Object.values(years)) {
  yearData.burnedArea = Math.round(yearData.burnedArea * 10) / 10;
  for (const department of Object.values(yearData.departments)) {
    department.burnedArea = Math.round(department.burnedArea * 10) / 10;
  }
}

writeFileSync(outputPath, `${JSON.stringify({
  updatedAt: new Date().toISOString(),
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
