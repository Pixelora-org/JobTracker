import { ResumeManager } from "@/components/resume-manager";
import { EmptyState } from "@/components/ui";
import { listApplications } from "@/lib/data/applications";
import { listResumes } from "@/lib/data/resumes";
import { resumeInsight, resumeStatsFor } from "@/lib/resume-stats";
import { getUser } from "@/lib/supabase/server";
import type { Application, Resume } from "@/lib/types";

export default async function ResumesPage() {
  const user = await getUser();

  let resumes: Resume[] = [];
  let applications: Application[] = [];
  let loadError: string | null = null;

  try {
    [resumes, applications] = await Promise.all([
      listResumes(),
      listApplications(),
    ]);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load resumes. Check your Supabase setup.";
  }

  const stats = resumeStatsFor(
    applications,
    resumes.map((r) => r.label)
  );
  const insight = resumeInsight(stats);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Library
        </p>
        <h1 className="text-xl font-medium tracking-tight">Resumes</h1>
        <p className="mt-1 text-sm text-muted">
          Keep every version you send, and see which one actually gets screens.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load resumes" description={loadError} />
      ) : (
        <ResumeManager
          userId={user!.id}
          resumes={resumes}
          stats={stats}
          insight={insight}
        />
      )}
    </div>
  );
}
