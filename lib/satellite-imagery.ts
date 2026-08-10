export const SATELLITE_IMAGE_WIDTH = 1024;
export const SATELLITE_IMAGE_HEIGHT = 576;
export const SATELLITE_GROUND_SAMPLE_DISTANCE_METERS = 10;

export const BURNED_AREA_DNBR_THRESHOLD = 0.27;

type NormalizedBurnRatioSample = {
  B08: number;
  B12: number;
};

export type BurnedAreaStatus = "available" | "missing_before" | "missing_after" | "missing_signal";
export type BurnedAreaComparison = {beforeAt: string; afterAt: string};

export function normalizedBurnRatio(sample: NormalizedBurnRatioSample) {
  const denominator = sample.B08 + sample.B12;
  return denominator === 0 ? 0 : (sample.B08 - sample.B12) / denominator;
}

export function burnedAreaChange(before: NormalizedBurnRatioSample, after: NormalizedBurnRatioSample) {
  const dNBR = normalizedBurnRatio(before) - normalizedBurnRatio(after);
  return {dNBR, isPotentialBurnedArea: dNBR >= BURNED_AREA_DNBR_THRESHOLD};
}

export function selectBurnedAreaComparison(signalAt: string | null, acquisitionTimes: string[]): {
  status: BurnedAreaStatus;
  comparison: BurnedAreaComparison | null;
} {
  const signalTime = signalAt ? new Date(signalAt).getTime() : Number.NaN;
  if (!Number.isFinite(signalTime)) return {status: "missing_signal", comparison: null};
  const chronological = acquisitionTimes
    .filter((value) => Number.isFinite(new Date(value).getTime()))
    .sort((a, b) => b.localeCompare(a));
  const beforeAt = chronological.find((value) => new Date(value).getTime() < signalTime);
  const afterAt = chronological.find((value) => new Date(value).getTime() >= signalTime);
  if (!beforeAt) return {status: "missing_before", comparison: null};
  if (!afterAt) return {status: "missing_after", comparison: null};
  return {status: "available", comparison: {beforeAt, afterAt}};
}

const METERS_PER_LATITUDE_DEGREE = 111_320;

export function satelliteImageBounds(latitude: number, longitude: number): [number, number, number, number] {
  const latitudeRadians = latitude * Math.PI / 180;
  const metersPerLongitudeDegree = METERS_PER_LATITUDE_DEGREE * Math.cos(latitudeRadians);
  const halfWidth = SATELLITE_IMAGE_WIDTH * SATELLITE_GROUND_SAMPLE_DISTANCE_METERS / 2 / metersPerLongitudeDegree;
  const halfHeight = SATELLITE_IMAGE_HEIGHT * SATELLITE_GROUND_SAMPLE_DISTANCE_METERS / 2 / METERS_PER_LATITUDE_DEGREE;
  return [longitude - halfWidth, latitude - halfHeight, longitude + halfWidth, latitude + halfHeight];
}
