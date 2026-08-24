import { TodayHome } from "@/components/today-home";
import { EmptyState } from "@/components/ui";
import { listActivitySince } from "@/lib/data/activity";
import { listApplications } from "@/lib/data/applications";
import { getActiveStrategy } from "@/lib/data/strategies";
import { listDueFollowUps, listTouchpoints } from "@/lib/data/touchpoints";
import { computeProgress } from "@/lib/strategy/progress";
import { friendlyDataError } from "@/lib/supabase/errors";
import { buildTodayActions } from "@/lib/today";

export default async function TodayPage() {
  let loadError: string | null = null;
  let actions: ReturnType<typeof buildTodayActions> = [];
  let hasStrategy = false;
  let restDay = false;

  try {
    const [applications, touchpoints, dueFollowUps, strategy] =
      await Promise.all([
        listApplications(),
        listTouchpoints(),
        listDueFollowUps(),
        getActiveStrategy(),
      ]);

    let progress = null;
    if (strategy) {
      hasStrategy = true;
      const activity = await listActivitySince(
        new Date(`${strategy.startDate}T00:00:00Z`).toISOString()
      );
      progress = computeProgress(strategy, activity);
      restDay = progress.metrics.every((m) => m.todayTarget === 0);
    }

    actions = buildTodayActions({
      applications,
      touchpoints,
      dueFollowUps,
      progress,
    });
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load today. Check your Supabase project and schema.";
  }

  const left = actions.length;

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Today
        </p>
        <h1 className="text-xl font-medium tracking-tight">
          {left === 0
            ? restDay
              ? "Rest day"
              : "You are clear"
            : `${left} thing${left === 1 ? "" : "s"} to do`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Do these next. The board and outreach stay one click away.
        </p>
      </div>

      {loadError ? (
        <EmptyState
          title="Couldn’t load today"
          description={friendlyDataError(loadError)}
        />
      ) : (
        <TodayHome
          actions={actions}
          hasStrategy={hasStrategy}
          restDay={restDay}
        />
      )}
    </div>
  );
}
