import test from "node:test";
import assert from "node:assert/strict";
import {
  BURNED_AREA_DNBR_THRESHOLD,
  SATELLITE_IMAGE_HEIGHT,
  SATELLITE_IMAGE_WIDTH,
  burnedAreaChange,
  normalizedBurnRatio,
  satelliteImageBounds,
  selectBurnedAreaComparison,
} from "../lib/satellite-imagery.ts";

const KM_PER_LATITUDE_DEGREE = 111.32;

test("cadre la vue Sentinel-2 au niveau de détail natif autour du signal", () => {
  const latitude = 46.8;
  const longitude = 4.4;
  const [west, south, east, north] = satelliteImageBounds(latitude, longitude);
  const widthKm = (east - west) * KM_PER_LATITUDE_DEGREE * Math.cos(latitude * Math.PI / 180);
  const heightKm = (north - south) * KM_PER_LATITUDE_DEGREE;

  assert.equal(SATELLITE_IMAGE_WIDTH, 1024);
  assert.equal(SATELLITE_IMAGE_HEIGHT, 576);
  assert.ok(Math.abs(widthKm - 10.24) < 0.02, `largeur inattendue: ${widthKm.toFixed(2)} km`);
  assert.ok(Math.abs(heightKm - 5.76) < 0.02, `hauteur inattendue: ${heightKm.toFixed(2)} km`);
  assert.ok(Math.abs((widthKm / heightKm) - (SATELLITE_IMAGE_WIDTH / SATELLITE_IMAGE_HEIGHT)) < 0.01);
  assert.ok(Math.abs((west + east) / 2 - longitude) < Number.EPSILON);
  assert.ok(Math.abs((south + north) / 2 - latitude) < Number.EPSILON);
});

test("calcule le ratio normalisé de brûlure avec les bandes NIR et SWIR", () => {
  assert.ok(Math.abs(normalizedBurnRatio({B08: 0.6, B12: 0.2}) - 0.5) < Number.EPSILON);
  assert.equal(normalizedBurnRatio({B08: 0, B12: 0}), 0);
});

test("repère uniquement une baisse significative du NBR entre avant et après", () => {
  assert.equal(BURNED_AREA_DNBR_THRESHOLD, 0.27);
  const burned = burnedAreaChange({B08: 0.62, B12: 0.18}, {B08: 0.22, B12: 0.38});
  assert.ok(burned.dNBR > BURNED_AREA_DNBR_THRESHOLD);
  assert.equal(burned.isPotentialBurnedArea, true);

  const stable = burnedAreaChange({B08: 0.52, B12: 0.2}, {B08: 0.48, B12: 0.22});
  assert.ok(stable.dNBR < BURNED_AREA_DNBR_THRESHOLD);
  assert.equal(stable.isPotentialBurnedArea, false);
});

test("sélectionne les acquisitions qui encadrent le signal thermique", () => {
  assert.deepEqual(selectBurnedAreaComparison("2026-08-04T12:00:00Z", [
    "2026-08-07T10:30:00Z",
    "2026-08-02T10:30:00Z",
    "2026-07-28T10:30:00Z",
  ]), {
    status: "available",
    comparison: {beforeAt: "2026-08-02T10:30:00Z", afterAt: "2026-08-07T10:30:00Z"},
  });
});

test("refuse une détection sans acquisition postérieure au signal", () => {
  assert.deepEqual(selectBurnedAreaComparison("2026-08-08T12:00:00Z", [
    "2026-08-07T10:30:00Z",
    "2026-08-02T10:30:00Z",
  ]), {status: "missing_after", comparison: null});
});
