import type { ActivityLog } from "@/lib/data/activity";
import {
  METRIC_MINUTES,
  STRATEGY_METRICS,
  type Strategy,
  type StrategyMetric,
  type StrategyPhase,
  type TargetPeriod,
} from "@/lib/types";

export type DayCounts = Record<StrategyMetric, number>;

export type MetricProgress = {
  metric: StrategyMetric;
  period: TargetPeriod;
  todayActual: number;
  todayTarget: number;
  /** Owed across completed days only, so an unfinished today never reads as a miss. */
  expectedToDate: number;
  actualToDate: number;
  /** Positive means behind. */
  gap: number;
  weekActual: number;
  weekTarget: number;
};

export type DayProgress = {
  key: string;
  weekday: number;
  active: boolean;
  isToday: boolean;
  metrics: { metric: StrategyMetric; actual: number; target: number }[];
  met: boolean;
};

export type CatchUp = {
  metric: StrategyMetric;
  perDay: number;
  days: number;
};

export type StrategyProgress = {
  today: string;
  metrics: MetricProgress[];
  days: DayProgress[];
  streak: number;
  minutesPerDay: number;
  catchUp: CatchUp[];
};

const HISTORY_DAYS = 28;
const CATCH_UP_WINDOW = 5;

const LINKEDIN_OUTREACH_TYPES = new Set([
  "Cold outreach",
  "Warm intro",
  "Referral ask",
]);

function emptyCounts(): DayCounts {
  return {
    applications: 0,
    coldEmails: 0,
    linkedinOutreach: 0,
    followUps: 0,
    referralAsks: 0,
  };
}

/** Calendar date in the user's zone. en-CA formats as YYYY-MM-DD. */
export function dateKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function todayKey(timeZone: string) {
  return dateKey(new Date().toISOString(), timeZone);
}

/** Midday UTC keeps date-only arithmetic clear of DST shifts. */
function asDate(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function shiftKey(key: string, days: number) {
  const d = asDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(key: string) {
  return asDate(key).getUTCDay();
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (asDate(to).getTime() - asDate(from).getTime()) / 86_400_000
  );
}

/** Monday-anchored, matching how a weekly quota is usually read. */
function weekStartKey(key: string) {
  const weekday = weekdayOf(key);
  return shiftKey(key, weekday === 0 ? -6 : 1 - weekday);
}

export function bucketActivity(activity: ActivityLog, timeZone: string) {
  const byDay = new Map<string, DayCounts>();

  const bump = (iso: string, metric: StrategyMetric) => {
    const key = dateKey(iso, timeZone);
    const counts = byDay.get(key) ?? emptyCounts();
    counts[metric] += 1;
    byDay.set(key, counts);
  };

  for (const iso of activity.applications) bump(iso, "applications");

  for (const t of activity.touchpoints) {
    if (t.channel === "Email" && t.type === "Cold outreach") {
      bump(t.date, "coldEmails");
    }
    if (t.channel === "LinkedIn" && LINKEDIN_OUTREACH_TYPES.has(t.type)) {
      bump(t.date, "linkedinOutreach");
    }
    // Deliberately overlapping lenses: a LinkedIn referral ask counts as both.
    if (t.type === "Follow-up") bump(t.date, "followUps");
    if (t.type === "Referral ask") bump(t.date, "referralAsks");
  }

  return byDay;
}

function phaseForWeek(phases: StrategyPhase[], weekIndex: number) {
  let start = 0;
  for (const phase of phases) {
    if (phase.weeks === null) return phase;
    if (weekIndex < start + phase.weeks) return phase;
    start += phase.weeks;
  }
  return phases.at(-1) ?? null;
}

/**
 * What a single active day owes. Weekly quotas spread evenly across the active
 * days so both period styles feed one pace calculation.
 */
function dailyRate(
  strategy: Strategy,
  metric: StrategyMetric,
  dayKey: string
): number {
  const weekIndex = Math.floor(daysBetween(strategy.startDate, dayKey) / 7);
  const phase = phaseForWeek(strategy.phases, weekIndex);
  const target = phase?.targets.find((t) => t.metric === metric);
  if (!target) return 0;

  if (target.period === "day") return target.count;
  const activeCount = strategy.activeDays.length || 7;
  return target.count / activeCount;
}

function isActiveDay(strategy: Strategy, key: string) {
  if (key < strategy.startDate) return false;
  if (strategy.endDate && key > strategy.endDate) return false;
  return strategy.activeDays.includes(weekdayOf(key));
}

function periodOf(strategy: Strategy, metric: StrategyMetric): TargetPeriod {
  for (const phase of strategy.phases) {
    const target = phase.targets.find((t) => t.metric === metric);
    if (target) return target.period;
  }
  return "day";
}

/** Metrics this plan actually tracks, in the order the phases list them. */
export function trackedMetrics(strategy: Strategy): StrategyMetric[] {
  const seen = new Set<StrategyMetric>();
  for (const phase of strategy.phases) {
    for (const target of phase.targets) {
      if (target.count > 0) seen.add(target.metric);
    }
  }
  return STRATEGY_METRICS.filter((m) => seen.has(m));
}

export function computeProgress(
  strategy: Strategy,
  activity: ActivityLog
): StrategyProgress {
  const byDay = bucketActivity(activity, strategy.timezone);
  const today = todayKey(strategy.timezone);
  const metrics = trackedMetrics(strategy);
  const countsOn = (key: string) => byDay.get(key) ?? emptyCounts();

  const lastDay = strategy.endDate && strategy.endDate < today ? strategy.endDate : today;
  const totalDays = Math.max(daysBetween(strategy.startDate, lastDay), 0);

  const metricProgress: MetricProgress[] = metrics.map((metric) => {
    let expectedToDate = 0;
    let actualToDate = 0;

    // Completed days only. Today is reported on its own so a morning glance
    // does not claim you are already behind. Only active days owe anything, but
    // work on an off day still counts, so a Saturday push pays down the gap.
    for (let i = 0; i < totalDays; i += 1) {
      const key = shiftKey(strategy.startDate, i);
      actualToDate += countsOn(key)[metric];
      if (!isActiveDay(strategy, key)) continue;
      expectedToDate += dailyRate(strategy, metric, key);
    }

    const weekStart = weekStartKey(today);
    let weekActual = 0;
    let weekTarget = 0;
    for (let i = 0; i < 7; i += 1) {
      const key = shiftKey(weekStart, i);
      if (key <= today) weekActual += countsOn(key)[metric];
      if (isActiveDay(strategy, key)) {
        weekTarget += dailyRate(strategy, metric, key);
      }
    }

    const expected = Math.round(expectedToDate);

    return {
      metric,
      period: periodOf(strategy, metric),
      todayActual: countsOn(today)[metric],
      todayTarget: isActiveDay(strategy, today)
        ? Math.round(dailyRate(strategy, metric, today))
        : 0,
      expectedToDate: expected,
      actualToDate,
      gap: Math.max(expected - actualToDate, 0),
      weekActual,
      weekTarget: Math.round(weekTarget),
    };
  });

  const days: DayProgress[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const key = shiftKey(today, -i);
    if (key < strategy.startDate) continue;

    const active = isActiveDay(strategy, key);
    const counts = countsOn(key);
    const rows = metrics.map((metric) => ({
      metric,
      actual: counts[metric],
      target: active ? Math.round(dailyRate(strategy, metric, key)) : 0,
    }));

    days.push({
      key,
      weekday: weekdayOf(key),
      active,
      isToday: key === today,
      metrics: rows,
      met: active && rows.every((r) => r.actual >= r.target),
    });
  }

  let streak = 0;
  for (let i = 0; i < 90; i += 1) {
    const key = shiftKey(today, -i);
    if (key < strategy.startDate) break;
    if (!isActiveDay(strategy, key)) continue;

    const counts = countsOn(key);
    const met = metrics.every(
      (m) => counts[m] >= Math.round(dailyRate(strategy, m, key))
    );

    if (met) {
      streak += 1;
      continue;
    }
    // An unfinished today should not wipe out a run that is still alive.
    if (key === today) continue;
    break;
  }

  const minutesPerDay = Math.round(
    metrics.reduce(
      (sum, m) => sum + dailyRate(strategy, m, today) * METRIC_MINUTES[m],
      0
    )
  );

  const catchUp = metricProgress
    .filter((m) => m.gap > 0)
    .map((m) => ({
      metric: m.metric,
      perDay: Math.ceil(m.gap / CATCH_UP_WINDOW),
      days: CATCH_UP_WINDOW,
    }));

  return { today, metrics: metricProgress, days, streak, minutesPerDay, catchUp };
}

/** Days in the trailing window with any logged activity at all. */
export function daysWithActivity(
  activity: ActivityLog,
  timeZone: string,
  days: number
) {
  const byDay = bucketActivity(activity, timeZone);
  const today = todayKey(timeZone);
  let count = 0;

  for (let i = 0; i <= days; i += 1) {
    const counts = byDay.get(shiftKey(today, -i));
    if (counts && STRATEGY_METRICS.some((m) => counts[m] > 0)) count += 1;
  }
  return count;
}

/** Averages per active day over a trailing window, used to ground AI proposals. */
export function recentAverages(
  activity: ActivityLog,
  timeZone: string,
  days: number
) {
  const byDay = bucketActivity(activity, timeZone);
  const today = todayKey(timeZone);
  const totals = emptyCounts();

  for (let i = 1; i <= days; i += 1) {
    const counts = byDay.get(shiftKey(today, -i));
    if (!counts) continue;
    for (const metric of STRATEGY_METRICS) totals[metric] += counts[metric];
  }

  const averages = {} as Record<StrategyMetric, number>;
  for (const metric of STRATEGY_METRICS) {
    averages[metric] = Number((totals[metric] / days).toFixed(1));
  }
  return averages;
}
