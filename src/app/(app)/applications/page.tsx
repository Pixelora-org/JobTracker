import { ApplicationsTable } from "@/components/applications-table";
import { EmptyState } from "@/components/ui";
import { AddApplicationButton } from "@/components/add-application-button";
import { listApplications } from "@/lib/data/applications";
import type { Application } from "@/lib/types";

export default async function ApplicationsPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;

  try {
    applications = await listApplications();
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load applications. Check your Supabase setup.";
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Applications
        </p>
        <h1 className="text-xl font-medium tracking-tight">Table</h1>
        <p className="mt-1 text-sm text-muted">
          Dense, sortable list. Filter by status, track, and source.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load applications" description={loadError} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="Nothing to scan yet"
          description="Add applications from the board or here, then sort and filter freely."
          action={<AddApplicationButton />}
        />
      ) : (
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}
