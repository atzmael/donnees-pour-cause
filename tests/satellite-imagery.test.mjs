import test from "node:test";
import assert from "node:assert/strict";
import {
  SATELLITE_IMAGE_HEIGHT,
  SATELLITE_IMAGE_WIDTH,
  satelliteImageBounds,
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

