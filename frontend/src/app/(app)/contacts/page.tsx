import { OutreachTabs, type OutreachTab } from "@/components/outreach-tabs";
import { EmptyState } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai/model";
import { listApplications } from "@/lib/data/applications";
import { listContacts } from "@/lib/data/contacts";
import { listDueFollowUps, listTouchpoints } from "@/lib/data/touchpoints";
import type { Application, Contact, Touchpoint } from "@/lib/types";

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const requested = (await searchParams).tab;
  const tab: OutreachTab = requested === "due" ? "due" : "people";
  let touchpoints: Touchpoint[] = [];
  let due: Touchpoint[] = [];
  let applications: Application[] = [];
  let contacts: Contact[] = [];
  let loadError: string | null = null;

  try {
    [touchpoints, due, applications, contacts] = await Promise.all([
      listTouchpoints(),
      listDueFollowUps(),
      listApplications(),
      listContacts().catch(() => []),
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
          People you have written to, and the ones waiting on a reply.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load outreach" description={loadError} />
      ) : (
        <OutreachTabs
          touchpoints={touchpoints}
          contacts={contacts}
          due={due}
          applicationOptions={applications.map((a) => ({
            id: a.id,
            label: `${a.company} · ${a.role}`,
          }))}
          initialTab={tab}
          aiEnabled={isAiConfigured}
        />
      )}
    </div>
  );
}
