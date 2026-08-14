import { JobSearch } from "@/components/job-search";
import { isAiConfigured } from "@/lib/ai/model";
import { listResumes } from "@/lib/data/resumes";
import { isJobsApiConfigured } from "@/lib/jobs/search";

export default async function JobsPage() {
  const resumes = await listResumes().catch(() => []);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Hunt
        </p>
        <h1 className="text-xl font-medium tracking-tight">Jobs</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a job type and a city, then save a listing onto the board as
          Wishlist.
        </p>
      </div>
      <JobSearch
        resumes={resumes}
        apiEnabled={isJobsApiConfigured()}
        aiEnabled={isAiConfigured}
      />
    </div>
  );
}
