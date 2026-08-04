import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pointIsInFrance} from "../lib/france-boundary.ts";

const departments = JSON.parse(readFileSync(new URL("../public/data/departements-1000m.geojson", import.meta.url), "utf8"));

test("le filtre conserve les détections situées en France métropolitaine", () => {
  assert.equal(pointIsInFrance(2.3522, 48.8566, departments), true, "Paris");
  assert.equal(pointIsInFrance(8.7386, 42.2448, departments), true, "Corse");
});

test("le filtre rejette les détections étrangères incluses dans la bbox FIRMS", () => {
  assert.equal(pointIsInFrance(4.3517, 50.8503, departments), false, "Bruxelles");
  assert.equal(pointIsInFrance(7.6869, 45.0703, departments), false, "Turin");
  assert.equal(pointIsInFrance(6.5, 43.0, departments), false, "Méditerranée");
});
