import Link from "next/link";
import { FunnelStrip } from "@/components/funnel-strip";
import { KanbanBoard } from "@/components/kanban-board";
import { TodayStrip } from "@/components/today-strip";
import { EmptyState } from "@/components/ui";
import { listActivitySince } from "@/lib/data/activity";
import { listApplications } from "@/lib/data/applications";
import { getActiveStrategy } from "@/lib/data/strategies";
import { computeProgress, type StrategyProgress } from "@/lib/strategy/progress";
import { friendlyDataError } from "@/lib/supabase/errors";
import { AddApplicationButton } from "@/components/add-application-button";
import type { Application, Strategy } from "@/lib/types";

export default async function DashboardPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;
  let progress: StrategyProgress | null = null;
  let strategy: Strategy | null = null;

  try {
    applications = await listApplications();
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load applications. Check your Supabase project and schema.";
  }

  try {
    strategy = await getActiveStrategy();
    if (strategy) {
      const activity = await listActivitySince(
        new Date(`${strategy.startDate}T00:00:00Z`).toISOString()
      );
      progress = computeProgress(strategy, activity);
    }
  } catch {
    progress = null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Dashboard
          </p>
          <h1 className="text-xl font-medium tracking-tight">Board</h1>
        </div>
        <p className="text-sm text-muted">
          Drag cards to update status. Stale apps (10d+) are highlighted.
        </p>
      </div>

      {loadError ? (
        <EmptyState
          title="Couldn’t load pipeline"
          description={friendlyDataError(loadError)}
        />
      ) : (
        <>
          {progress ? (
            <TodayStrip progress={progress} />
          ) : (
            <Link
              href="/strategy"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/25 bg-accent-soft/40 px-4 py-3 transition-colors hover:bg-accent-soft/70"
            >
              <span className="text-sm text-text">
                No targets set. Decide how much you are aiming for and the board
                starts measuring itself against it.
              </span>
              <span className="font-mono text-[11px] text-accent">
                Build a strategy ↗
              </span>
            </Link>
          )}

          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="This is the kanban. Add a role and it lands in a column. Strategy is a separate page for daily volume."
              action={<AddApplicationButton />}
            />
          ) : (
            <>
              <FunnelStrip applications={applications} />
              <KanbanBoard initialApplications={applications} />
            </>
          )}
        </>
      )}
    </div>
  );
}
