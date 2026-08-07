import {NextRequest, NextResponse} from "next/server";
import officialConfirmations from "@/public/data/official-fire-confirmations.json";

export const dynamic = "force-dynamic";

type Position = [number, number];
type Geometry = {type: "Polygon"; coordinates: Position[][]} | {type: "MultiPolygon"; coordinates: Position[][][]};
type EffisFeature = {properties?: Record<string, unknown>; geometry?: Geometry};
type OfficialRecord = {
  id: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  radiusKm?: number;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
};

function validNumber(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const earthRadius = 6371;
  const latitudeDelta = (latitudeB - latitudeA) * Math.PI / 180;
  const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA * Math.PI / 180) * Math.cos(latitudeB * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInRing(longitude: number, latitude: number, ring: Position[]) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
    const [currentX, currentY] = ring[current];
    const [previousX, previousY] = ring[previous];
    if (((currentY > latitude) !== (previousY > latitude))
      && longitude < ((previousX - currentX) * (latitude - currentY)) / (previousY - currentY) + currentX) inside = !inside;
  }
  return inside;
}

function pointInGeometry(longitude: number, latitude: number, geometry?: Geometry) {
  if (!geometry) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInRing(longitude, latitude, polygon[0])
    && !polygon.slice(1).some((hole) => pointInRing(longitude, latitude, hole)));
}

function property(properties: Record<string, unknown> | undefined, ...names: string[]) {
  for (const name of names) {
    const entry = Object.entries(properties ?? {}).find(([key]) => key.toLocaleUpperCase() === name);
    if (entry?.[1] !== undefined && entry[1] !== null) return String(entry[1]);
  }
  return null;
}

function officialMatch(latitude: number, longitude: number, observedAt: string | null) {
  const observedTime = observedAt ? new Date(observedAt).getTime() : Date.now();
  return (officialConfirmations.records as OfficialRecord[]).find((record) => {
    const recordTime = new Date(record.observedAt).getTime();
    return Math.abs(observedTime - recordTime) <= 7 * 86_400_000
      && distanceKm(latitude, longitude, record.latitude, record.longitude) <= (record.radiusKm ?? 20);
  });
}

async function effisMatch(latitude: number, longitude: number, observedAt: string | null) {
  const radius = 0.12;
  const url = new URL("https://maps.effis.emergency.copernicus.eu/effis");
  Object.entries({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typename: "ms:modis.ba.poly",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox: `${latitude - radius},${longitude - radius},${latitude + radius},${longitude + radius},EPSG:4326`,
    maxFeatures: "100",
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {cache: "no-store", signal: AbortSignal.timeout(12_000)});
  if (!response.ok) throw new Error(`effis_${response.status}`);
  const data = await response.json() as {features?: EffisFeature[]};
  return (data.features ?? []).find((feature) => {
    const country = property(feature.properties, "COUNTRY");
    const fireDate = property(feature.properties, "FIREDATE", "LASTUPDATE", "FINALDATE");
    const fireTime = fireDate ? new Date(fireDate.replace(" ", "T")).getTime() : Number.NaN;
    const observedTime = observedAt ? new Date(observedAt).getTime() : Date.now();
    const dateMatches = Number.isFinite(fireTime) && Math.abs(observedTime - fireTime) <= 45 * 86_400_000;
    return (!country || country === "FR") && dateMatches && pointInGeometry(longitude, latitude, feature.geometry);
  });
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const observedAt = request.nextUrl.searchParams.get("observedAt");
  if (!validNumber(latitude, 41, 52) || !validNumber(longitude, -6, 10)) {
    return NextResponse.json({error: "invalid_parameters"}, {status: 400});
  }

  const official = officialMatch(latitude, longitude, observedAt);
  if (official) {
    return NextResponse.json({
      level: "official",
      label: "Confirmé officiellement",
      sourceName: official.sourceName,
      sourceUrl: official.sourceUrl,
      observedAt: official.observedAt,
      publishedAt: official.publishedAt,
      effisStatus: "not_needed",
    });
  }

  try {
    const feature = await effisMatch(latitude, longitude, observedAt);
    if (!feature) return NextResponse.json({level: null, effisStatus: "available"});
    return NextResponse.json({
      level: "mapped",
      label: "Zone brûlée cartographiée",
      sourceName: "EFFIS Rapid Damage Assessment",
      sourceUrl: "https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/rapid-damage-assessment",
      observedAt: property(feature.properties, "FIREDATE", "LASTUPDATE", "FINALDATE"),
      areaHa: Number(property(feature.properties, "AREA_HA") ?? 0) || null,
      effisStatus: "available",
    });
  } catch {
    return NextResponse.json({level: null, effisStatus: "unavailable"});
  }
}
