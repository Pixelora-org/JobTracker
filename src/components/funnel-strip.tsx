"use client";

import { computeConversionFunnel } from "@/lib/utils";
import type { Application } from "@/lib/types";
import { CountUp } from "@/components/count-up";
import { MicroLabel } from "@/components/ui";

export function FunnelStrip({ applications }: { applications: Application[] }) {
  const f = computeConversionFunnel(applications);

  const stages = [
    { label: "Applied", count: f.applied, rate: null as number | null },
    { label: "Screen", count: f.screen, rate: f.toScreen },
    { label: "Interview", count: f.interview, rate: f.toInterview },
    { label: "Offer", count: f.offer, rate: f.toOffer },
  ];

  return (
    <section className="animate-funnel rounded-lg border border-border bg-surface px-4 py-3 sm:px-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <MicroLabel>Funnel</MicroLabel>
        <p className="font-mono text-[11px] text-muted">
          current pipeline · stage ÷ previous
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className="relative min-w-0 border-l border-border pl-3 first:border-l-0 first:pl-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-medium tabular-nums text-text">
                <CountUp value={stage.count} />
              </span>
              {i > 0 ? (
                <span className="font-mono text-[11px] text-accent">
                  {stage.rate === null ? "-" : `${stage.rate}%`}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted">{stage.label}</p>
            {i > 0 && stage.rate !== null ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.min(stage.rate, 100)}%` }}
                />
              </div>
            ) : (
              <div className="mt-2 h-1 rounded-full bg-background" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
