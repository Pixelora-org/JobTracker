"use client";

import Link from "next/link";
import { useAppShell } from "@/components/app-shell-provider";
import { cn } from "@/lib/utils";

type Step = { key: string; label: string; caption: string };

const STEPS: Step[] = [
  { key: "plan", label: "Plan", caption: "set the volume" },
  { key: "apply", label: "Apply", caption: "log what you send" },
  { key: "track", label: "Track", caption: "watch the pace" },
];

export function StrategyHero({
  headline,
  detail,
  current,
}: {
  headline: string;
  detail: string;
  /** Which step of the flow the user is standing on. */
  current: "plan" | "apply" | "track";
}) {
  const { openCapture } = useAppShell();
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <section className="overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/50">
      <div className="flex items-stretch border-b border-accent/15">
        {STEPS.map((step, i) => {
          const active = i === currentIndex;
          const done = i < currentIndex;

          const inner = (
            <>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px]",
                    active
                      ? "bg-accent text-white"
                      : done
                        ? "bg-accent/25 text-accent"
                        : "border border-accent/30 text-accent/60",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-[0.08em]",
                    active ? "text-accent" : "text-accent/60",
                  )}
                >
                  {step.label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                {step.caption}
              </span>
            </>
          );

          const classes = cn(
            "flex-1 border-r border-accent/15 px-3 py-2 text-left last:border-r-0 transition-colors",
            !active && "hover:bg-accent-soft",
          );

          if (step.key === "apply") {
            return (
              <button
                key={step.key}
                type="button"
                onClick={openCapture}
                className={classes}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={step.key}
              href={step.key === "plan" ? "/strategy" : "/today"}
              className={classes}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <h2 className="font-mono text-3xl font-medium tracking-tight text-text sm:text-4xl">
          {headline}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">{detail}</p>
      </div>
    </section>
  );
}
