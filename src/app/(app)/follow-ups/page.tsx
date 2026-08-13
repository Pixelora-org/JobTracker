import { FollowUpList } from "@/components/follow-up-list";
import { EmptyState } from "@/components/ui";
import { listDueFollowUps } from "@/lib/data/touchpoints";
import type { Touchpoint } from "@/lib/types";

export default async function FollowUpsPage() {
  let touchpoints: Touchpoint[] = [];
  let loadError: string | null = null;

  try {
    touchpoints = await listDueFollowUps();
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load follow-ups. Check your Supabase setup.";
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Reminders
        </p>
        <h1 className="text-xl font-medium tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted">
          Outreach you sent that has reached its reminder date.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load follow-ups" description={loadError} />
      ) : (
        <FollowUpList touchpoints={touchpoints} />
      )}
    </div>
  );
}
