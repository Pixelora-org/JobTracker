import Link from "next/link";
import type { StrategyProgress } from "@/lib/strategy/progress";
import { METRIC_LABELS } from "@/lib/types";
import { MicroLabel } from "@/components/ui";

/** The one line worth seeing every morning: what is still owed today. */
export function TodayStrip({ progress }: { progress: StrategyProgress }) {
  const rows = progress.metrics.map((m) => {
    const isWeekly = m.period === "week";
    const actual = isWeekly ? m.weekActual : m.todayActual;
    const target = isWeekly ? m.weekTarget : m.todayTarget;
    return { metric: m.metric, actual, target, left: Math.max(target - actual, 0) };
  });

  const remaining = rows.reduce((sum, r) => sum + r.left, 0);

  return (
    <section className="rounded-lg border border-border bg-surface px-4 py-3 sm:px-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <MicroLabel>Today</MicroLabel>
        <Link
          href="/strategy"
          className="font-mono text-[11px] text-accent hover:underline"
        >
          {remaining === 0 ? "all clear ↗" : `${remaining} left ↗`}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {rows.map((row) => (
          <div key={row.metric} className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-medium tabular-nums text-text">
                {row.actual}
              </span>
              <span className="font-mono text-xs text-muted">
                / {row.target}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {METRIC_LABELS[row.metric]}
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width: `${
                    row.target === 0
                      ? 100
                      : Math.min((row.actual / row.target) * 100, 100)
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
