export type Detection = {
  latitude: number;
  longitude: number;
  acquiredAt: string;
  satellite: string;
  instrument: string;
  confidence: string;
  frp: number;
  daynight: string;
};

export type ObservedEvent = {
  id: string;
  latitude: number;
  longitude: number;
  detections: Detection[];
  firstAt: string;
  lastAt: string;
  maxFrp: number;
};

export type MapView = {x: number; y: number; width: number; height: number};
export type MapCluster = {id: string; x: number; y: number; events: ObservedEvent[]};

export const FULL_MAP_VIEW: MapView = {x: 0, y: 0, width: 650, height: 620};
export const MIN_MAP_VIEW_WIDTH = 108;

const EARTH_RADIUS_KM = 6371;
const EVENT_DISTANCE_KM = 18;
const EVENT_MAX_GAP_MS = 36 * 3_600_000;
const EVENT_CELL_DEGREES = 0.3;

export function projectFirePosition(longitude: number, latitude: number): [number, number] {
  return [((longitude + 5.6) / 15.4) * 620 + 12, ((51.3 - latitude) / 10.4) * 590 + 8];
}

function distanceKm(a: Detection, b: {latitude: number; longitude: number}) {
  const latitudeDelta = (b.latitude - a.latitude) * Math.PI / 180;
  const longitudeDelta = (b.longitude - a.longitude) * Math.PI / 180;
  const latitudeA = a.latitude * Math.PI / 180;
  const latitudeB = b.latitude * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function eventCell(longitude: number, latitude: number) {
  return [Math.floor(longitude / EVENT_CELL_DEGREES), Math.floor(latitude / EVENT_CELL_DEGREES)] as const;
}

function cellKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function clusterDetections(detections: Detection[]): ObservedEvent[] {
  const events: ObservedEvent[] = [];
  const cells = new Map<string, Set<ObservedEvent>>();
  const metadata = new Map<ObservedEvent, {cell: string; lastTime: number; order: number}>();

  for (const detection of [...detections].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))) {
    const detectionTime = new Date(detection.acquiredAt).getTime();
    const [cellX, cellY] = eventCell(detection.longitude, detection.latitude);
    let match: ObservedEvent | undefined;
    let matchOrder = Number.POSITIVE_INFINITY;

    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        const bucket = cells.get(cellKey(x, y));
        if (!bucket) continue;
        for (const candidate of bucket) {
          const candidateMetadata = metadata.get(candidate);
          if (!candidateMetadata) continue;
          if (detectionTime - candidateMetadata.lastTime > EVENT_MAX_GAP_MS) {
            bucket.delete(candidate);
            continue;
          }
          if (candidateMetadata.order < matchOrder && distanceKm(detection, candidate) <= EVENT_DISTANCE_KM) {
            match = candidate;
            matchOrder = candidateMetadata.order;
          }
        }
      }
    }

    if (!match) {
      const event: ObservedEvent = {
        id: `${detection.latitude.toFixed(2)}-${detection.longitude.toFixed(2)}-${detection.acquiredAt.slice(0, 10)}`,
        latitude: detection.latitude,
        longitude: detection.longitude,
        detections: [detection],
        firstAt: detection.acquiredAt,
        lastAt: detection.acquiredAt,
        maxFrp: detection.frp,
      };
      const key = cellKey(cellX, cellY);
      events.push(event);
      if (!cells.has(key)) cells.set(key, new Set());
      cells.get(key)?.add(event);
      metadata.set(event, {cell: key, lastTime: detectionTime, order: events.length - 1});
      continue;
    }

    const count = match.detections.length;
    match.latitude = (match.latitude * count + detection.latitude) / (count + 1);
    match.longitude = (match.longitude * count + detection.longitude) / (count + 1);
    match.detections.push(detection);
    match.lastAt = detection.acquiredAt;
    match.maxFrp = Math.max(match.maxFrp, detection.frp);

    const matchMetadata = metadata.get(match);
    if (!matchMetadata) continue;
    const [nextCellX, nextCellY] = eventCell(match.longitude, match.latitude);
    const nextCell = cellKey(nextCellX, nextCellY);
    if (nextCell !== matchMetadata.cell) {
      cells.get(matchMetadata.cell)?.delete(match);
      if (!cells.has(nextCell)) cells.set(nextCell, new Set());
      cells.get(nextCell)?.add(match);
      matchMetadata.cell = nextCell;
    }
    matchMetadata.lastTime = detectionTime;
  }

  return events.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function isProbableFire(event: ObservedEvent) {
  const hasReliableMeasurement = event.detections.some((detection) => ["n", "h"].includes(detection.confidence.toLowerCase()));
  return event.detections.length >= 2 && event.maxFrp >= 10 && hasReliableMeasurement;
}

export function eventIsInMapView(event: ObservedEvent, view: MapView) {
  const [x, y] = projectFirePosition(event.longitude, event.latitude);
  return x >= view.x && x <= view.x + view.width && y >= view.y && y <= view.y + view.height;
}

export function clusterEventsForMap(events: ObservedEvent[], view: MapView): MapCluster[] {
  const cellSize = 38 * view.width / FULL_MAP_VIEW.width;
  const clusters = new Map<string, MapCluster>();

  for (const event of events) {
    const [x, y] = projectFirePosition(event.longitude, event.latitude);
    if (x < view.x || x > view.x + view.width || y < view.y || y > view.y + view.height) continue;
    const column = Math.floor((x - view.x) / cellSize);
    const row = Math.floor((y - view.y) / cellSize);
    const id = `${column}:${row}`;
    const cluster = clusters.get(id);
    if (!cluster) {
      clusters.set(id, {id, x, y, events: [event]});
      continue;
    }
    const count = cluster.events.length;
    cluster.x = (cluster.x * count + x) / (count + 1);
    cluster.y = (cluster.y * count + y) / (count + 1);
    cluster.events.push(event);
  }

  return Array.from(clusters.values());
}

export function zoomMapView(view: MapView, factor: number, centerX = view.x + view.width / 2, centerY = view.y + view.height / 2): MapView {
  const width = Math.max(MIN_MAP_VIEW_WIDTH, Math.min(FULL_MAP_VIEW.width, view.width * factor));
  const height = width * FULL_MAP_VIEW.height / FULL_MAP_VIEW.width;
  const x = Math.max(0, Math.min(FULL_MAP_VIEW.width - width, centerX - width / 2));
  const y = Math.max(0, Math.min(FULL_MAP_VIEW.height - height, centerY - height / 2));
  return {x, y, width, height};
}
