import Link from "next/link";
import { BoardViews, type BoardView } from "@/components/board-views";
import { FunnelStrip } from "@/components/funnel-strip";
import { EmptyState } from "@/components/ui";
import { listActivitySince } from "@/lib/data/activity";
import { listApplications } from "@/lib/data/applications";
import { getActiveStrategy } from "@/lib/data/strategies";
import { computeProgress, type StrategyProgress } from "@/lib/strategy/progress";
import { friendlyDataError } from "@/lib/supabase/errors";
import { AddApplicationButton } from "@/components/add-application-button";
import type { Application, Strategy } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view: BoardView =
    (await searchParams).view === "table" ? "table" : "kanban";
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
            Pipeline
          </p>
          <h1 className="text-xl font-medium tracking-tight">Board</h1>
        </div>
        <p className="text-sm text-muted">
          Drag a card onto another stage to move it, or switch to the table to
          sort and filter.
        </p>
      </div>

      {loadError ? (
        <EmptyState
          title="Couldn’t load pipeline"
          description={friendlyDataError(loadError)}
        />
      ) : (
        <>
          <Link
            href="/today"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-background"
          >
            <span className="text-sm text-text">
              {progress
                ? "Today has the next three moves. This page is the pipeline."
                : "Today has the next three moves. Set a volume when you want targets."}
            </span>
            <span className="font-mono text-[11px] text-accent">
              {progress ? "Open today ↗" : "Open today ↗"}
            </span>
          </Link>

          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Add a role and it lands in Wishlist. Open a stage to work that list."
              action={<AddApplicationButton />}
            />
          ) : (
            <>
              <FunnelStrip applications={applications} />
              <BoardViews applications={applications} initialView={view} />
            </>
          )}
        </>
      )}
    </div>
  );
}
