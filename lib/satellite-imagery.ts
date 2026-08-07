export const SATELLITE_IMAGE_WIDTH = 1024;
export const SATELLITE_IMAGE_HEIGHT = 576;
export const SATELLITE_GROUND_SAMPLE_DISTANCE_METERS = 10;

const METERS_PER_LATITUDE_DEGREE = 111_320;

export function satelliteImageBounds(latitude: number, longitude: number): [number, number, number, number] {
  const latitudeRadians = latitude * Math.PI / 180;
  const metersPerLongitudeDegree = METERS_PER_LATITUDE_DEGREE * Math.cos(latitudeRadians);
  const halfWidth = SATELLITE_IMAGE_WIDTH * SATELLITE_GROUND_SAMPLE_DISTANCE_METERS / 2 / metersPerLongitudeDegree;
  const halfHeight = SATELLITE_IMAGE_HEIGHT * SATELLITE_GROUND_SAMPLE_DISTANCE_METERS / 2 / METERS_PER_LATITUDE_DEGREE;
  return [longitude - halfWidth, latitude - halfHeight, longitude + halfWidth, latitude + halfHeight];
}
