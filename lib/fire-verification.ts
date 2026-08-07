export type Position = [number, number];

export type OfficialFireRecord = {
  id: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  observedAt: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  title?: string | null;
  area?: string | null;
  rings?: Position[][];
};

export type EffisFireRecord = {
  id: string;
  firedAt: string;
  updatedAt: string | null;
  areaHa: number;
  department: string | null;
  commune: string | null;
  bbox: [number, number, number, number];
  rings: Position[][];
};

export function distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
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

export function pointInRings(longitude: number, latitude: number, rings: Position[][]) {
  return rings.reduce((inside, ring) => pointInRing(longitude, latitude, ring) ? !inside : inside, false);
}

function distanceToSegmentKm(longitude: number, latitude: number, start: Position, end: Position) {
  const longitudeScale = 111 * Math.cos(latitude * Math.PI / 180);
  const startX = (start[0] - longitude) * longitudeScale;
  const startY = (start[1] - latitude) * 111;
  const endX = (end[0] - longitude) * longitudeScale;
  const endY = (end[1] - latitude) * 111;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const denominator = deltaX ** 2 + deltaY ** 2;
  const ratio = denominator ? Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / denominator)) : 0;
  return Math.hypot(startX + ratio * deltaX, startY + ratio * deltaY);
}

function distanceToRingsKm(longitude: number, latitude: number, rings: Position[][]) {
  let shortest = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index += 1) {
      shortest = Math.min(shortest, distanceToSegmentKm(longitude, latitude, ring[index], ring[(index + 1) % ring.length]));
    }
  }
  return shortest;
}

function closeInTime(first: string, second: string | null, maximumDays: number) {
  const firstTime = new Date(first).getTime();
  const secondTime = second ? new Date(second).getTime() : Date.now();
  return Number.isFinite(firstTime) && Number.isFinite(secondTime)
    && Math.abs(firstTime - secondTime) <= maximumDays * 86_400_000;
}

export function findOfficialFire(
  records: OfficialFireRecord[],
  latitude: number,
  longitude: number,
  observedAt: string | null,
) {
  return records.find((record) => closeInTime(record.observedAt, observedAt, 7)
    && (record.rings?.length && pointInRings(longitude, latitude, record.rings)
      || distanceKm(latitude, longitude, record.latitude, record.longitude) <= record.radiusKm));
}

export function findEffisFire(
  records: EffisFireRecord[],
  latitude: number,
  longitude: number,
  observedAt: string | null,
) {
  const toleranceKm = 2.5;
  const latitudeMargin = toleranceKm / 111;
  const longitudeMargin = toleranceKm / (111 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));
  return records.find((record) => closeInTime(record.firedAt, observedAt, 45)
    && longitude >= record.bbox[0] - longitudeMargin
    && longitude <= record.bbox[2] + longitudeMargin
    && latitude >= record.bbox[1] - latitudeMargin
    && latitude <= record.bbox[3] + latitudeMargin
    && (pointInRings(longitude, latitude, record.rings)
      || distanceToRingsKm(longitude, latitude, record.rings) <= toleranceKm));
}
