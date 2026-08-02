import test from "node:test";
import assert from "node:assert/strict";
import {
  EVOLUTION_PLOT_END,
  EVOLUTION_PLOT_START,
  EVOLUTION_VIEWBOX_WIDTH,
  evolutionYearFromRelativeX,
} from "../lib/evolution-scale.ts";

const earliestYear = 2006;
const latestYear = 2026;
const xForYear = (year) => EVOLUTION_PLOT_START
  + ((year - earliestYear) / (latestYear - earliestYear))
  * (EVOLUTION_PLOT_END - EVOLUTION_PLOT_START);

test("le survol bascule à l’année la plus proche entre deux points", () => {
  const justAfterMidpoint2023To2024 = (xForYear(2023) + xForYear(2024)) / 2 + 1;
  assert.equal(
    evolutionYearFromRelativeX(justAfterMidpoint2023To2024 / EVOLUTION_VIEWBOX_WIDTH, earliestYear, latestYear),
    2024,
  );
});

test("les marges du graphique restent bornées aux années extrêmes", () => {
  assert.equal(evolutionYearFromRelativeX(0, earliestYear, latestYear), earliestYear);
  assert.equal(evolutionYearFromRelativeX(1, earliestYear, latestYear), latestYear);
});
