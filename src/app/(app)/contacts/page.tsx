import { ContactsTable } from "@/components/contacts-table";
import { TouchpointForm } from "@/components/touchpoint-form";
import { EmptyState } from "@/components/ui";
import { listApplications } from "@/lib/data/applications";
import { listTouchpoints } from "@/lib/data/touchpoints";
import type { Application, Touchpoint } from "@/lib/types";

export default async function ContactsPage() {
  let touchpoints: Touchpoint[] = [];
  let applications: Application[] = [];
  let loadError: string | null = null;

  try {
    [touchpoints, applications] = await Promise.all([
      listTouchpoints(),
      listApplications(),
    ]);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load touchpoints. Check your Supabase setup.";
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Networking
        </p>
        <h1 className="text-xl font-medium tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-muted">
          Outreach log across applications. Filter by channel and status.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load contacts" description={loadError} />
      ) : (
        <>
          <TouchpointForm
            applicationOptions={applications.map((a) => ({
              id: a.id,
              label: `${a.company} · ${a.role}`,
            }))}
          />
          <ContactsTable touchpoints={touchpoints} />
        </>
      )}
    </div>
  );
}
