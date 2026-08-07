import test from "node:test";
import assert from "node:assert/strict";
import {findEffisFire, findOfficialFire, pointInRings} from "../lib/fire-verification.ts";

const square = [[
  [1.9, 47.9],
  [2.1, 47.9],
  [2.1, 48.1],
  [1.9, 48.1],
  [1.9, 47.9],
]];

test("le rapprochement géographique reconnaît un point dans une zone", () => {
  assert.equal(pointInRings(2, 48, square), true);
  assert.equal(pointInRings(3, 48, square), false);
});

test("FR-Alert confirme uniquement un signal proche dans le temps et l’espace", () => {
  const record = {
    id: "official",
    latitude: 48,
    longitude: 2,
    radiusKm: 10,
    observedAt: "2026-08-07T10:00:00Z",
    publishedAt: "2026-08-07T10:05:00Z",
    sourceName: "Préfecture de test",
    sourceUrl: "https://example.test/alert",
    rings: square,
  };
  assert.equal(findOfficialFire([record], 48.05, 2.05, "2026-08-07T12:00:00Z")?.id, "official");
  assert.equal(findOfficialFire([record], 48.05, 2.05, "2026-08-20T12:00:00Z"), undefined);
  assert.equal(findOfficialFire([record], 46, 2, "2026-08-07T12:00:00Z"), undefined);
});

test("EFFIS tolère l’écart spatial d’un pixel VIIRS sans accepter une zone lointaine", () => {
  const record = {
    id: "mapped",
    firedAt: "2026-08-06T10:00:00Z",
    updatedAt: "2026-08-07T08:00:00Z",
    areaHa: 42,
    department: "Test",
    commune: "Test",
    bbox: [1.9, 47.9, 2.1, 48.1],
    rings: square,
  };
  assert.equal(findEffisFire([record], 48.11, 2, "2026-08-07T12:00:00Z")?.id, "mapped");
  assert.equal(findEffisFire([record], 48.2, 2, "2026-08-07T12:00:00Z"), undefined);
  assert.equal(findEffisFire([record], 48, 2, "2026-10-07T12:00:00Z"), undefined);
});
