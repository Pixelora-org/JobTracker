import { METRIC_MINUTES, type StrategyTarget } from "@/lib/types";

/** Rough daily cost of a target set, which is what exposes an unrealistic plan. */
export function minutesPerDay(
  targets: StrategyTarget[],
  activeDaysPerWeek: number
) {
  const perWeekDivisor = activeDaysPerWeek || 7;

  return Math.round(
    targets.reduce((sum, t) => {
      const perDay = t.period === "day" ? t.count : t.count / perWeekDivisor;
      return sum + perDay * METRIC_MINUTES[t.metric];
    }, 0)
  );
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
