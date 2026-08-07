import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {
  FULL_MAP_VIEW,
  clusterDetections,
  clusterEventsForMap,
  zoomMapView,
} from "../lib/fire-observatory.ts";

function detection(index, overrides = {}) {
  return {
    latitude: 46.5,
    longitude: 2.5,
    acquiredAt: new Date(Date.UTC(2026, 6, 8) + index * 60_000).toISOString(),
    satellite: "N20",
    instrument: "VIIRS",
    confidence: "n",
    frp: 20,
    daynight: "D",
    ...overrides,
  };
}

test("regroupe les observations proches sans fusionner les signaux éloignés", () => {
  const events = clusterDetections([
    detection(0),
    detection(1, {latitude: 46.51, longitude: 2.51}),
    detection(2, {latitude: 49, longitude: 6}),
  ]);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.detections.length).sort(), [1, 2]);
});

test("conserve un coût raisonnable sur une charge de trente jours", () => {
  const detections = Array.from({length: 12_000}, (_, index) => detection(index, {
    latitude: 41.5 + (index * 0.137) % 9.2,
    longitude: -5 + (index * 0.173) % 14,
  }));
  const startedAt = performance.now();
  const events = clusterDetections(detections);
  const duration = performance.now() - startedAt;
  assert.equal(events.length, detections.length);
  assert.ok(duration < 1_500, `regroupement trop lent: ${Math.round(duration)} ms`);
});

test("agrège les foyers proches sur la carte et les sépare au zoom", () => {
  const events = Array.from({length: 12}, (_, index) => ({
    id: String(index),
    latitude: 46.5 + index * 0.015,
    longitude: 2.5 + index * 0.015,
    detections: [detection(index)],
    firstAt: detection(index).acquiredAt,
    lastAt: detection(index).acquiredAt,
    maxFrp: 20,
  }));
  const overviewClusters = clusterEventsForMap(events, FULL_MAP_VIEW);
  const zoomed = zoomMapView(FULL_MAP_VIEW, 0.2, overviewClusters[0].x, overviewClusters[0].y);
  const zoomedClusters = clusterEventsForMap(events, zoomed);
  assert.ok(overviewClusters.length < events.length);
  assert.ok(zoomedClusters.length > overviewClusters.length);
});
