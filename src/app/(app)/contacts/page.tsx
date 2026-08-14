import { OutreachTabs, type OutreachTab } from "@/components/outreach-tabs";
import { EmptyState } from "@/components/ui";
import { listApplications } from "@/lib/data/applications";
import { listDueFollowUps, listTouchpoints } from "@/lib/data/touchpoints";
import type { Application, Touchpoint } from "@/lib/types";

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab: OutreachTab = (await searchParams).tab === "due" ? "due" : "all";
  let touchpoints: Touchpoint[] = [];
  let due: Touchpoint[] = [];
  let applications: Application[] = [];
  let loadError: string | null = null;

  try {
    [touchpoints, due, applications] = await Promise.all([
      listTouchpoints(),
      listDueFollowUps(),
      listApplications(),
    ]);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load outreach. Check your Supabase setup.";
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Networking
        </p>
        <h1 className="text-xl font-medium tracking-tight">Outreach</h1>
        <p className="mt-1 text-sm text-muted">
          Every message you have sent, and the ones waiting on a reply.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load outreach" description={loadError} />
      ) : (
        <OutreachTabs
          touchpoints={touchpoints}
          due={due}
          applicationOptions={applications.map((a) => ({
            id: a.id,
            label: `${a.company} · ${a.role}`,
          }))}
          initialTab={tab}
        />
      )}
    </div>
  );
}
