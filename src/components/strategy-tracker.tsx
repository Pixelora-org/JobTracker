"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveStrategyAction } from "@/lib/actions/strategies";
import type { StrategyProgress } from "@/lib/strategy/progress";
import { formatDuration } from "@/lib/strategy/effort";
import { METRIC_LABELS, type Strategy } from "@/lib/types";
import { Button, ErrorBanner, MicroLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

const GREEN = "#1F9D5A";
const AMBER = "#D89A2E";
const RED = "#9B2C3D";

function ratioColor(actual: number, target: number) {
  if (target === 0) return actual > 0 ? GREEN : null;
  const ratio = actual / target;
  if (ratio >= 1) return GREEN;
  if (ratio >= 0.5) return AMBER;
  if (ratio > 0) return RED;
  return null;
}

function Bar({ actual, target }: { actual: number; target: number }) {
  const pct = target === 0 ? (actual > 0 ? 100 : 0) : Math.min((actual / target) * 100, 100);
  const color = ratioColor(actual, target) ?? "#E4E7EC";

  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function StrategyTracker({
  strategy,
  progress,
}: {
  strategy: Strategy;
  progress: StrategyProgress;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();

  const restDay = progress.metrics.every((m) => m.todayTarget === 0);

  function replace() {
    setError(null);
    startArchive(async () => {
      const res = await archiveStrategyAction(strategy.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}

      <section className="rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <MicroLabel>Volume</MicroLabel>
            <h2 className="mt-1 text-base font-medium text-text">
              {strategy.name}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted">
              {strategy.activeDays.length} days a week ·{" "}
              {formatDuration(progress.minutesPerDay)}/day
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={archiving}
              onClick={replace}
            >
              {archiving ? "Archiving…" : "Replace plan"}
            </Button>
          </div>
        </div>

        {restDay ? (
          <p className="mt-2 text-sm text-muted">Nothing due today.</p>
        ) : progress.catchUp.length ? (
          <p className="mt-2 text-sm text-muted">
            Clear the gap with{" "}
            <span className="text-text">
              {progress.catchUp
                .map(
                  (c) => `+${c.perDay} ${METRIC_LABELS[c.metric].toLowerCase()}`,
                )
                .join(" and ")}
            </span>{" "}
            a day for {progress.catchUp[0].days} days.
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {progress.metrics.map((m) => (
          <article
            key={m.metric}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-text">
                {METRIC_LABELS[m.metric]}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {m.period === "week" ? "weekly" : "daily"}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-medium tabular-nums text-text">
                {m.period === "week" ? m.weekActual : m.todayActual}
              </span>
              <span className="font-mono text-sm text-muted">
                / {m.period === "week" ? m.weekTarget : m.todayTarget}
              </span>
              <span className="ml-auto font-mono text-[11px] text-muted">
                {m.period === "week" ? "this week" : "today"}
              </span>
            </div>

            <Bar
              actual={m.period === "week" ? m.weekActual : m.todayActual}
              target={m.period === "week" ? m.weekTarget : m.todayTarget}
            />

            <p className="mt-2 font-mono text-[11px]">
              {m.gap > 0 ? (
                <span style={{ color: RED }}>{m.gap} behind pace</span>
              ) : (
                <span style={{ color: GREEN }}>on pace</span>
              )}
              <span className="text-muted">
                {" "}
                · {m.actualToDate} done of {m.expectedToDate} owed
              </span>
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <MicroLabel>Last {progress.days.length} days</MicroLabel>
          <span className="font-mono text-[11px] text-muted">
            filled = hit target · faded = short · blank = rest day
          </span>
        </div>

        <div className="mt-3 space-y-1.5 overflow-x-auto">
          {progress.metrics.map((m) => (
            <div key={m.metric} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-xs text-muted">
                {METRIC_LABELS[m.metric]}
              </span>
              <div className="flex gap-[3px]">
                {progress.days.map((day) => {
                  const cell = day.metrics.find((x) => x.metric === m.metric);
                  const actual = cell?.actual ?? 0;
                  const target = cell?.target ?? 0;
                  const color = day.active ? ratioColor(actual, target) : null;

                  return (
                    <span
                      key={day.key}
                      title={`${day.key}: ${actual} of ${target}${
                        day.active ? "" : " (rest day)"
                      }`}
                      className={cn(
                        "h-5 w-3 rounded-sm border",
                        day.isToday ? "border-accent" : "border-transparent",
                        !color && "bg-background",
                      )}
                      style={color ? { backgroundColor: color } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {strategy.rationale ? (
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-mono uppercase tracking-[0.08em]">Why: </span>
          {strategy.rationale}
        </p>
      ) : null}
    </div>
  );
}
