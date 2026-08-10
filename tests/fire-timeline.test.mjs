import test from "node:test";
import assert from "node:assert/strict";
import {buildFireTimeline} from "../lib/fire-timeline.ts";

test("couvre toute la période choisie et compte toutes les observations disponibles", () => {
  const fetchedAt = "2026-08-08T12:00:00.000Z";
  const timeline = buildFireTimeline(fetchedAt, 7 * 24, [
    "2026-07-20T10:00:00.000Z",
    "2026-08-03T08:00:00.000Z",
    "2026-08-03T08:00:00.000Z",
    "2026-08-07T15:30:00.000Z",
  ]);

  assert.ok(timeline);
  assert.equal(new Date(timeline.start).toISOString(), "2026-08-01T12:00:00.000Z");
  assert.equal(new Date(timeline.end).toISOString(), fetchedAt);
  assert.equal(timeline.totalObservations, 3);
  assert.equal(timeline.steps[0].observationCount, 0);
  assert.equal(timeline.steps.at(-1).observationCount, 3);
});

test("conserve les bornes de période même sans observation", () => {
  const timeline = buildFireTimeline("2026-08-08T12:00:00.000Z", 30 * 24, []);
  assert.ok(timeline);
  assert.equal(new Date(timeline.start).toISOString(), "2026-07-09T12:00:00.000Z");
  assert.equal(new Date(timeline.end).toISOString(), "2026-08-08T12:00:00.000Z");
  assert.deepEqual(timeline.steps.map((step) => step.observationCount), [0, 0, 0, 0, 0, 0]);
});

