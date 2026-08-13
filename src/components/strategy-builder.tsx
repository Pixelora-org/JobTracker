"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStrategyAction,
  proposeStrategiesAction,
} from "@/lib/actions/strategies";
import type { StrategyProposal } from "@/lib/ai/strategy";
import { formatDuration, minutesPerDay } from "@/lib/strategy/effort";
import {
  METRIC_LABELS,
  STRATEGY_METRICS,
  type StrategyMetric,
  type StrategyPhase,
  type TargetPeriod,
} from "@/lib/types";
import {
  Button,
  ErrorBanner,
  Input,
  MicroLabel,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS = [1, 2, 3, 4, 5];

const EXAMPLE =
  "Security internship by December. About 2 hours a day on weekdays. I want 15 applications a day plus cold outreach.";

function phaseSummary(phases: StrategyPhase[], activeDays: number) {
  return phases
    .map((phase) => {
      const window = phase.weeks ? `${phase.weeks}w` : "onward";
      const targets = phase.targets
        .filter((t) => t.count > 0)
        .map((t) => `${t.count} ${METRIC_LABELS[t.metric].toLowerCase()}/${t.period}`)
        .join(", ");
      return `${window}: ${targets || "nothing"} · ${formatDuration(
        minutesPerDay(phase.targets, activeDays)
      )}/day`;
    })
    .join("\n");
}

export function StrategyBuilder({
  aiEnabled,
  grounded,
}: {
  aiEnabled: boolean;
  /** Whether there is enough logged activity to tune targets to. */
  grounded: boolean;
}) {
  const router = useRouter();
  const [goalText, setGoalText] = useState("");
  const [activeDays, setActiveDays] = useState<number[]>(WEEKDAYS);
  const [proposals, setProposals] = useState<StrategyProposal[] | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    phases: StrategyPhase[];
    rationale: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposing, startPropose] = useTransition();
  const [saving, startSave] = useTransition();

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function toggleDay(day: number) {
    setActiveDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  function propose() {
    setError(null);
    startPropose(async () => {
      const res = await proposeStrategiesAction({
        goalText,
        activeDays,
        timezone,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProposals(res.data);
      setDraft(null);
    });
  }

  function choose(proposal: StrategyProposal) {
    setDraft({
      name: proposal.name,
      phases: proposal.phases,
      rationale: proposal.rationale,
    });
  }

  function updateTarget(
    phaseIndex: number,
    metric: StrategyMetric,
    patch: { count?: number; period?: TargetPeriod },
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      const phases = prev.phases.map((phase, i) => {
        if (i !== phaseIndex) return phase;
        const exists = phase.targets.some((t) => t.metric === metric);
        const targets = exists
          ? phase.targets.map((t) =>
              t.metric === metric ? { ...t, ...patch } : t,
            )
          : [
              ...phase.targets,
              { metric, count: patch.count ?? 0, period: patch.period ?? "day" },
            ];
        return { ...phase, targets };
      });
      return { ...prev, phases };
    });
  }

  function setPhaseWeeks(phaseIndex: number, weeks: number | null) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            phases: prev.phases.map((p, i) =>
              i === phaseIndex ? { ...p, weeks } : p,
            ),
          }
        : prev,
    );
  }

  function activate() {
    if (!draft) return;
    setError(null);

    startSave(async () => {
      const res = await createStrategyAction({
        name: draft.name,
        startDate: new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
        activeDays,
        timezone,
        goalText,
        rationale: draft.rationale,
        phases: draft.phases.map((phase) => ({
          ...phase,
          targets: phase.targets.filter((t) => t.count > 0),
        })),
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <MicroLabel>Step 1 · What are you aiming for</MicroLabel>
          <p className="mt-1 text-sm text-muted">
            {grounded
              ? "Say what you want and how much time you have. Your last two weeks of real activity get sent along, so the targets come back tuned to what you sustain."
              : "Say what you want and how much time you have. This first plan is built around your numbers, not your history. Once you have a couple of weeks logged, we can tune it to what you actually sustain."}
          </p>
        </div>

        <Textarea
          value={goalText}
          placeholder={EXAMPLE}
          onChange={(e) => setGoalText(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MicroLabel>Working days</MicroLabel>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={activeDays.includes(day)}
                  className={cn(
                    "h-7 w-7 rounded-md border font-mono text-[11px] transition-colors",
                    activeDays.includes(day)
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted hover:text-text",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={proposing || !aiEnabled || !goalText.trim()}
            onClick={propose}
            title={
              aiEnabled ? undefined : "Add GOOGLE_GENERATIVE_AI_API_KEY to enable"
            }
          >
            {proposing ? "Thinking…" : "Build me a plan"}
          </Button>
        </div>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      {proposals ? (
        <section className="space-y-3">
          <MicroLabel>Step 2 · Pick a starting point</MicroLabel>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {proposals.map((proposal) => {
              const chosen = draft?.name === proposal.name;
              const finalPhase = proposal.phases.at(-1);

              return (
                <article
                  key={proposal.name}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                    chosen
                      ? "border-accent bg-accent-soft/40"
                      : "border-border bg-surface hover:border-accent/40",
                  )}
                >
                  <div>
                    <h3 className="text-sm font-medium text-text">
                      {proposal.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {proposal.philosophy}
                    </p>
                  </div>

                  <p className="whitespace-pre-line font-mono text-[11px] leading-relaxed text-accent">
                    {phaseSummary(proposal.phases, activeDays.length)}
                  </p>

                  <p className="text-xs leading-snug text-muted">
                    {proposal.rationale}
                  </p>
                  <p className="text-xs leading-snug text-[#9B2C3D]">
                    {proposal.risk}
                  </p>

                  <Button
                    type="button"
                    variant={chosen ? "primary" : "secondary"}
                    size="sm"
                    className="mt-auto"
                    onClick={() => choose(proposal)}
                  >
                    {chosen
                      ? "Selected"
                      : `Use this${
                          finalPhase
                            ? ` · ${formatDuration(
                                minutesPerDay(finalPhase.targets, activeDays.length),
                              )}/day`
                            : ""
                        }`}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {draft ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <MicroLabel>Step 3 · Adjust anything, then start</MicroLabel>
            <p className="mt-1 text-sm text-muted">
              Set a target to zero to drop it. Weekly suits low-volume work like
              referral asks.
            </p>
          </div>

          <label className="flex max-w-sm flex-col gap-1.5">
            <MicroLabel>Name</MicroLabel>
            <Input
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
              }
            />
          </label>

          {draft.phases.map((phase, phaseIndex) => (
            <div
              key={phaseIndex}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-text">
                  {phase.label}
                </span>
                <div className="flex items-center gap-2">
                  <MicroLabel>Lasts</MicroLabel>
                  {phase.weeks === null ? (
                    <span className="font-mono text-[11px] text-muted">
                      until you stop
                    </span>
                  ) : (
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={phase.weeks}
                      onChange={(e) =>
                        setPhaseWeeks(phaseIndex, Number(e.target.value) || 1)
                      }
                      className="h-8 w-16 text-xs"
                    />
                  )}
                  {phase.weeks === null ? null : (
                    <span className="font-mono text-[11px] text-muted">weeks</span>
                  )}
                  <span className="font-mono text-[11px] text-accent">
                    {formatDuration(
                      minutesPerDay(phase.targets, activeDays.length),
                    )}
                    /day
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {STRATEGY_METRICS.map((metric) => {
                  const target = phase.targets.find((t) => t.metric === metric);
                  return (
                    <div
                      key={metric}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                    >
                      <span className="flex-1 truncate text-xs text-text">
                        {METRIC_LABELS[metric]}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={target?.count ?? 0}
                        onChange={(e) =>
                          updateTarget(phaseIndex, metric, {
                            count: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="h-8 w-16 text-xs"
                      />
                      <Select
                        value={target?.period ?? "day"}
                        onChange={(e) =>
                          updateTarget(phaseIndex, metric, {
                            period: e.target.value as TargetPeriod,
                          })
                        }
                        className="h-8 w-20 text-xs"
                      >
                        <option value="day">/ day</option>
                        <option value="week">/ week</option>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={saving} onClick={activate}>
              {saving ? "Starting…" : "Start this strategy"}
            </Button>
            <span className="font-mono text-[11px] text-muted">
              starts today · {activeDays.length} days a week
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
