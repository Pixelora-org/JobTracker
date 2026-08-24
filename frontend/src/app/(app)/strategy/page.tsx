import { StrategyBuilder } from "@/components/strategy-builder";
import { StrategyHero } from "@/components/strategy-hero";
import { StrategyNudge } from "@/components/strategy-nudge";
import { StrategyTracker } from "@/components/strategy-tracker";
import { ErrorBanner } from "@/components/ui";
import { skipStrategyAction } from "@/lib/actions/onboarding";
import { isAiConfigured } from "@/lib/ai/model";
import { listActivitySince } from "@/lib/data/activity";
import { getActiveStrategy } from "@/lib/data/strategies";
import { loadPlanningContext } from "@/lib/strategy/history";
import { computeProgress, type StrategyProgress } from "@/lib/strategy/progress";
import { friendlyDataError } from "@/lib/supabase/errors";
import { METRIC_LABELS, type Strategy } from "@/lib/types";

const RETUNE_AFTER_DAYS = 14;

function daysSinceStart(startDate: string) {
  return Math.max(
    Math.round(
      (Date.now() - new Date(`${startDate}T12:00:00Z`).getTime()) / 86_400_000
    ),
    0
  );
}

function headlineFor(progress: StrategyProgress) {
  const left = progress.metrics.reduce((sum, m) => {
    const actual = m.period === "week" ? m.weekActual : m.todayActual;
    const target = m.period === "week" ? m.weekTarget : m.todayTarget;
    return sum + Math.max(target - actual, 0);
  }, 0);

  const resting = progress.metrics.every((m) => m.todayTarget === 0);
  const behind = progress.metrics.filter((m) => m.gap > 0);

  const headline = resting
    ? "Rest day"
    : left === 0
      ? "Done for today"
      : `${left} left today`;

  const pace =
    behind.length === 0
      ? "On pace across every target."
      : `Behind on ${behind
          .map((m) => `${m.gap} ${METRIC_LABELS[m.metric].toLowerCase()}`)
          .join(", ")}.`;

  const streak =
    progress.streak > 0 ? ` ${progress.streak} day streak.` : "";

  return { headline, detail: `${pace}${streak}` };
}

export default async function StrategyPage() {
  let strategy: Strategy | null = null;
  let progress: StrategyProgress | null = null;
  let grounded = false;
  let loadError: string | null = null;

  try {
    strategy = await getActiveStrategy();
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load your strategy. Check your Supabase project and schema.";
  }

  if (strategy) {
    try {
      const activity = await listActivitySince(
        new Date(`${strategy.startDate}T00:00:00Z`).toISOString()
      );
      progress = computeProgress(strategy, activity);
      if (daysSinceStart(strategy.startDate) >= RETUNE_AFTER_DAYS) {
        grounded = (await loadPlanningContext(strategy.timezone)).grounded;
      }
    } catch (e) {
      loadError =
        loadError ??
        (e instanceof Error ? e.message : "Could not load strategy progress.");
    }
  } else {
    try {
      grounded = (await loadPlanningContext("UTC")).grounded;
    } catch {
      grounded = false;
    }
  }

  const running = strategy ? daysSinceStart(strategy.startDate) : 0;
  const status = progress ? headlineFor(progress) : null;

  return (
    <div className="space-y-5">
      {loadError ? (
        <ErrorBanner message={friendlyDataError(loadError)} />
      ) : null}

      {strategy && progress && status ? (
        <>
          <StrategyHero
            headline={status.headline}
            detail={status.detail}
            current="track"
          />
          {grounded && running >= RETUNE_AFTER_DAYS ? (
            <StrategyNudge strategyId={strategy.id} daysRunning={running} />
          ) : null}
          <StrategyTracker strategy={strategy} progress={progress} />
        </>
      ) : (
        <>
          <StrategyHero
            headline="Start with a plan"
            detail={
              grounded
                ? "How much time you have, and how many applications and notes that buys. Today will turn it into three next moves."
                : "How much time you have. Today will turn the volume into three next moves."
            }
            current="plan"
          />
          <StrategyBuilder aiEnabled={isAiConfigured} grounded={grounded} />
          <form action={skipStrategyAction}>
            <button
              type="submit"
              className="font-mono text-[11px] text-muted hover:text-text"
            >
              Skip for now →
            </button>
          </form>
        </>
      )}
    </div>
  );
}
