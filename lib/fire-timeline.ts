export type FireTimelineStep = {
  cutoff: number;
  observationCount: number;
};

export type FireTimeline = {
  start: number;
  end: number;
  totalObservations: number;
  steps: FireTimelineStep[];
};

export function buildFireTimeline(
  fetchedAt: string | null,
  periodHours: number,
  observationTimes: string[],
  stepCount = 6,
): FireTimeline | null {
  if (!fetchedAt || periodHours <= 0 || stepCount < 2) return null;
  const end = new Date(fetchedAt).getTime();
  if (!Number.isFinite(end)) return null;
  const start = end - periodHours * 3_600_000;
  const times = observationTimes
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time) && time >= start && time <= end)
    .sort((a, b) => a - b);
  const steps = Array.from({length: stepCount}, (_, index) => {
    const cutoff = start + ((end - start) * index / (stepCount - 1));
    return {cutoff, observationCount: times.filter((time) => time <= cutoff).length};
  });
  return {start, end, totalObservations: times.length, steps};
}
