import {execFileSync} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const currentYear = new Date().getFullYear();
const effisRetentionDays = 90;
const workspace = mkdtempSync(join(tmpdir(), "fire-verification-"));
const effisOutputPath = new URL("../public/data/effis-current-fires.json", import.meta.url);
const officialOutputPath = new URL("../public/data/official-fire-confirmations.json", import.meta.url);

function curl(args) {
  execFileSync("curl", [
    "-L", "--fail", "--silent", "--show-error",
    "--connect-timeout", "20", "--max-time", "120",
    ...args,
  ], {stdio: "inherit"});
}

function roundCoordinate(value) {
  return Math.round(value * 100_000) / 100_000;
}

function normalizeEffisDate(value) {
  if (!value) return null;
  const isoValue = `${value.replace(" ", "T").replace(/(\.\d{3})\d+$/, "$1")}Z`;
  const parsed = new Date(isoValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
    let offset = headerLength + recordIndex * recordLength;
    if (buffer[offset] === 0x2a) {
      records.push(null);
      continue;
    }
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

function parseShapefile(path) {
  const buffer = readFileSync(path);
  const shapes = [];
  for (let offset = 100; offset + 8 <= buffer.length;) {
    const contentLength = buffer.readInt32BE(offset + 4) * 2;
    const start = offset + 8;
    const shapeType = buffer.readInt32LE(start);
    if (![5, 15, 25].includes(shapeType)) {
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
    shapes.push({
      bbox,
      rings: parts.map((pointIndex, index) => points.slice(pointIndex, parts[index + 1] ?? points.length)),
    });
    offset = start + contentLength;
  }
  return shapes;
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let deltaX = end[0] - x;
  let deltaY = end[1] - y;
  if (deltaX !== 0 || deltaY !== 0) {
    const ratio = ((point[0] - x) * deltaX + (point[1] - y) * deltaY) / (deltaX ** 2 + deltaY ** 2);
    if (ratio > 1) {
      x = end[0];
      y = end[1];
    } else if (ratio > 0) {
      x += deltaX * ratio;
      y += deltaY * ratio;
    }
  }
  deltaX = point[0] - x;
  deltaY = point[1] - y;
  return deltaX ** 2 + deltaY ** 2;
}

function simplifyOpenLine(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const toleranceSquared = tolerance ** 2;
  while (stack.length) {
    const [first, last] = stack.pop();
    let furthestIndex = -1;
    let furthestDistance = toleranceSquared;
    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredSegmentDistance(points[index], points[first], points[last]);
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }
    if (furthestIndex !== -1) {
      keep[furthestIndex] = 1;
      stack.push([first, furthestIndex], [furthestIndex, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function simplifyRing(ring) {
  if (ring.length <= 5) return ring.map(([longitude, latitude]) => [roundCoordinate(longitude), roundCoordinate(latitude)]);
  const openRing = ring.slice(0, -1);
  let furthestIndex = 1;
  let furthestDistance = 0;
  for (let index = 1; index < openRing.length; index += 1) {
    const distance = (openRing[index][0] - openRing[0][0]) ** 2 + (openRing[index][1] - openRing[0][1]) ** 2;
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  const firstArc = simplifyOpenLine(openRing.slice(0, furthestIndex + 1), 0.0003);
  const secondArc = simplifyOpenLine([...openRing.slice(furthestIndex), openRing[0]], 0.0003);
  const simplified = [...firstArc, ...secondArc.slice(1)]
    .map(([longitude, latitude]) => [roundCoordinate(longitude), roundCoordinate(latitude)]);
  if (simplified.length < 4) return ring.slice(0, 4).map(([longitude, latitude]) => [roundCoordinate(longitude), roundCoordinate(latitude)]);
  return simplified;
}

function parseFrenchDate(value, utcLabel) {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (!match) return null;
  const rawOffset = Number(utcLabel?.match(/UTC([+-]\d{1,2})/)?.[1] ?? 1);
  const offset = `${rawOffset >= 0 ? "+" : "-"}${String(Math.abs(rawOffset)).padStart(2, "0")}:00`;
  const parsed = new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}${offset}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function collectCoordinateStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectCoordinateStrings(item, result));
  return result;
}

function parseAlertRings(area) {
  return collectCoordinateStrings(area?.polygone)
    .map((coordinateString) => coordinateString.trim().split(/\s+/).map((coordinate) => {
      const [latitude, longitude] = coordinate.split(",").map(Number);
      return [roundCoordinate(longitude), roundCoordinate(latitude)];
    }).filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude)))
    .filter((ring) => ring.length >= 4);
}

function areaCenter(rings, fallback) {
  const points = rings.flat();
  if (!points.length) return fallback;
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return {
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}

function radiusForRings(rings, center) {
  if (!rings.length || !center) return 20;
  const farthest = Math.max(...rings.flat().map(([longitude, latitude]) => {
    const latitudeKm = (latitude - center.latitude) * 111;
    const longitudeKm = (longitude - center.longitude) * 111 * Math.cos(center.latitude * Math.PI / 180);
    return Math.hypot(latitudeKm, longitudeKm);
  }));
  return Math.round(Math.min(40, Math.max(10, farthest + 4)) * 10) / 10;
}

function updateEffis() {
  const zipPath = join(workspace, "effis-france.zip");
  const directory = join(workspace, "effis");
  curl([
    "--get", "https://maps.effis.emergency.copernicus.eu/effis",
    "--data-urlencode", "service=WFS",
    "--data-urlencode", "version=1.1.0",
    "--data-urlencode", "request=GetFeature",
    "--data-urlencode", "typename=ms:modis.ba.poly",
    "--data-urlencode", "outputFormat=SHAPEZIP",
    "--data-urlencode", "srsName=EPSG:4326",
    "--data-urlencode", "bbox=41.0,-5.6,51.3,10.0,EPSG:4326",
    "-o", zipPath,
  ]);
  execFileSync("unzip", ["-o", zipPath, "-d", directory], {stdio: "ignore"});
  const records = parseDbf(join(directory, "modis.ba.poly.dbf"));
  const shapes = parseShapefile(join(directory, "modis.ba.poly.shp"));
  if (records.length !== shapes.length) throw new Error(`Intégrité EFFIS invalide : ${records.length} enregistrements pour ${shapes.length} formes.`);
  const cutoff = Date.now() - effisRetentionDays * 86_400_000;
  const fires = [];
  let cutoffAt = null;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const shape = shapes[index];
    const firedAt = normalizeEffisDate(record?.FIREDATE);
    if (record?.COUNTRY !== "FR" || !shape || !firedAt || new Date(firedAt).getTime() < cutoff) continue;
    const updatedAt = normalizeEffisDate(record.LASTUPDATE || record.FINALDATE || record.FIREDATE);
    if (updatedAt && (!cutoffAt || updatedAt > cutoffAt)) cutoffAt = updatedAt;
    fires.push({
      id: String(record.id),
      firedAt,
      updatedAt,
      areaHa: Math.round(Number(record.AREA_HA || 0) * 10) / 10,
      department: record.PROVINCE || null,
      commune: record.COMMUNE || null,
      bbox: shape.bbox.map(roundCoordinate),
      rings: shape.rings.map(simplifyRing).filter((ring) => ring.length >= 4),
    });
  }
  writeFileSync(effisOutputPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    cutoffAt,
    retentionDays: effisRetentionDays,
    sourceName: "EFFIS Rapid Damage Assessment",
    sourceUrl: "https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/rapid-damage-assessment",
    records: fires,
  }, null, 2)}\n`);
  console.log(`Index EFFIS : ${fires.length} périmètres récents.`);
}

function updateOfficialConfirmations() {
  const htmlPath = join(workspace, "fr-alert.html");
  const idsPath = join(workspace, "fr-alert-fire-ids.json");
  const exportPath = join(workspace, "fr-alert-fires.json");
  curl(["https://www.fr-alert.gouv.fr/les-alertes", "-o", htmlPath]);
  const html = readFileSync(htmlPath, "utf8");
  const settingsMatch = html.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([\s\S]*?)<\/script>/);
  if (!settingsMatch) throw new Error("Configuration FR-Alert introuvable.");
  const settings = JSON.parse(settingsMatch[1]);
  const alertAreas = settings.alert_entity?.alerts ?? {};
  const ids = Object.entries(alertAreas)
    .filter(([, areas]) => areas.some((area) => String(area.info_event).toLowerCase() === "forest fire"
      && !area.level?.some(({value}) => String(value).includes("EXERCISE"))))
    .map(([id]) => id);
  if (!ids.length) throw new Error("Aucune alerte feu de forêt trouvée dans FR-Alert.");
  writeFileSync(idsPath, JSON.stringify(ids));
  curl([
    "-X", "POST", "https://www.fr-alert.gouv.fr/export-alert",
    "-H", "Content-Type: application/json",
    "--data-binary", `@${idsPath}`,
    "-o", exportPath,
  ]);
  const exported = JSON.parse(readFileSync(exportPath, "utf8"));
  const records = [];
  for (const alert of Object.values(exported)) {
    if (alert.status !== "Réel" || !alert.identifiant) continue;
    const publishedAt = parseFrenchDate(alert.dateEmission, alert.fuseauHoraire?.utc);
    if (!publishedAt || new Date(publishedAt).getUTCFullYear() !== currentYear) continue;
    const fallbackCenters = (alertAreas[alert.identifiant] ?? []).map((area) => {
      const geography = area.geography_center?.[0];
      return geography ? {latitude: Number(geography.lon), longitude: Number(geography.lat)} : null;
    }).filter(Boolean);
    for (let infoIndex = 0; infoIndex < (alert.infos ?? []).length; infoIndex += 1) {
      const info = alert.infos[infoIndex];
      if (String(info.évènement).toLocaleLowerCase("fr-FR") !== "feu de forêt"
        || String(info.certitude).toLocaleLowerCase("fr-FR") !== "observé") continue;
      const observedAt = parseFrenchDate(info.dateEffective, info.fuseauHoraire?.utc) ?? publishedAt;
      const areas = info.areas?.length ? info.areas : [{}];
      for (let areaIndex = 0; areaIndex < areas.length; areaIndex += 1) {
        const rings = parseAlertRings(areas[areaIndex]);
        const fallback = fallbackCenters[areaIndex] ?? fallbackCenters[infoIndex] ?? fallbackCenters[0] ?? null;
        const center = areaCenter(rings, fallback);
        if (!center || !Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)) continue;
        records.push({
          id: `${alert.identifiant}-${infoIndex}-${areaIndex}`,
          latitude: roundCoordinate(center.latitude),
          longitude: roundCoordinate(center.longitude),
          radiusKm: radiusForRings(rings, center),
          observedAt,
          publishedAt,
          sourceName: String(info.nomExpediteur || "FR-Alert").trim(),
          sourceUrl: `https://www.fr-alert.gouv.fr/les-alertes/${alert.identifiant}`,
          title: info.titre || "Feu de forêt",
          area: areas[areaIndex].descriptionZone || info.zone || null,
          rings,
        });
      }
    }
  }
  writeFileSync(officialOutputPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    methodology: "Alertes FR-Alert réelles dont l’événement est « Feu de forêt » et la certitude « Observé ». La confirmation est rapprochée d’un signal satellite par sa date et sa zone géographique.",
    sourceName: "FR-Alert",
    sourceUrl: "https://www.fr-alert.gouv.fr/les-alertes",
    records,
  }, null, 2)}\n`);
  console.log(`Index FR-Alert : ${records.length} zones officiellement confirmées en ${currentYear}.`);
}

let updates = 0;
for (const [label, updater, outputPath] of [
  ["EFFIS", updateEffis, effisOutputPath],
  ["FR-Alert", updateOfficialConfirmations, officialOutputPath],
]) {
  try {
    updater();
    updates += 1;
  } catch (error) {
    console.warn(`::warning::${label} indisponible, dernière version valide conservée. ${error instanceof Error ? error.message : ""}`);
    if (!existsSync(outputPath)) throw error;
  }
}

rmSync(workspace, {recursive: true, force: true});
if (!updates) console.log("Aucune source de validation n’a pu être actualisée.");
