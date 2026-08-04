export type GeoPosition = [number, number];
export type BoundaryFeature = {
  properties?: Record<string, unknown>;
  geometry:
    | {type: "Polygon"; coordinates: GeoPosition[][]}
    | {type: "MultiPolygon"; coordinates: GeoPosition[][][]};
};
export type BoundaryCollection = {features: BoundaryFeature[]};

function pointIsInRing(longitude: number, latitude: number, ring: GeoPosition[]) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
    const [currentLongitude, currentLatitude] = ring[current];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crossesLatitude = (currentLatitude > latitude) !== (previousLatitude > latitude);
    const intersectionLongitude = ((previousLongitude - currentLongitude) * (latitude - currentLatitude))
      / (previousLatitude - currentLatitude) + currentLongitude;
    if (crossesLatitude && longitude < intersectionLongitude) inside = !inside;
  }
  return inside;
}

function pointIsInPolygon(longitude: number, latitude: number, rings: GeoPosition[][]) {
  if (!rings.length || !pointIsInRing(longitude, latitude, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointIsInRing(longitude, latitude, hole));
}

export function pointIsInBoundaryFeature(longitude: number, latitude: number, feature: BoundaryFeature) {
  if (feature.geometry.type === "Polygon") {
    return pointIsInPolygon(longitude, latitude, feature.geometry.coordinates);
  }
  return feature.geometry.coordinates.some((polygon) => pointIsInPolygon(longitude, latitude, polygon));
}

export function pointIsInFrance(
  longitude: number,
  latitude: number,
  departments: BoundaryCollection,
) {
  return departments.features.some((feature) => pointIsInBoundaryFeature(longitude, latitude, feature));
}
