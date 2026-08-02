export const EVOLUTION_VIEWBOX_WIDTH = 980;
export const EVOLUTION_PLOT_START = 30;
export const EVOLUTION_PLOT_END = 950;

export function evolutionYearFromRelativeX(relativeX: number, earliestYear: number, latestYear: number) {
  const viewBoxX = Math.max(0, Math.min(1, relativeX)) * EVOLUTION_VIEWBOX_WIDTH;
  const plotProgress = Math.max(0, Math.min(
    1,
    (viewBoxX - EVOLUTION_PLOT_START) / (EVOLUTION_PLOT_END - EVOLUTION_PLOT_START),
  ));
  const nearestYear = Math.round(earliestYear + plotProgress * (latestYear - earliestYear));
  return Math.max(earliestYear, Math.min(latestYear, nearestYear));
}
