"use server";

import { revalidatePath } from "next/cache";
import { isAiConfigured } from "@/lib/ai/model";
import { jobSearchParamsFromProfile } from "@/lib/ai/job-search";
import { createApplication } from "@/lib/data/applications";
import { getActiveStrategy } from "@/lib/data/strategies";
import { listResumes } from "@/lib/data/resumes";
import { isJobsApiConfigured, searchJobListings, type JobListing } from "@/lib/jobs/search";
import {
  DEFAULT_JOB_FILTERS,
  resolveJobLocation,
  type JobFilters,
} from "@/lib/jobs/filters";
import { passesSponsorshipFilter } from "@/lib/jobs/sponsorship";
import { consumeQuota } from "@/lib/quota";
import { getUser } from "@/lib/supabase/server";
import type { Track } from "@/lib/types";

import type { ActionResult } from "@/lib/actions/result";

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function guessTrack(query: string): Track {
  const q = query.toLowerCase();
  if (/security|cyber|infosec/.test(q)) return "Cybersecurity";
  if (/software|engineer|developer|swe|frontend|backend/.test(q)) {
    return "Software Engineering";
  }
  return "Other";
}

export async function searchJobsAction(input: {
  resumeLabel?: string;
  titles?: string;
  location?: string;
  filters?: Partial<JobFilters>;
}): Promise<
  ActionResult<{ listings: JobListing[]; query: string; hidden: number }>
> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isJobsApiConfigured()) {
      return {
        ok: false,
        error:
          "Job listings are off. Add ADZUNA_APP_ID and ADZUNA_APP_KEY, or RAPIDAPI_KEY, to .env.local.",
      };
    }

    const filters: JobFilters = { ...DEFAULT_JOB_FILTERS, ...input.filters };
    const picked = resolveJobLocation(input.location ?? "");
    let query = input.titles?.trim() ?? "";
    const remote = picked.value === "remote";
    const location = remote ? "" : picked.value;
    const country = picked.country;

    const needsAi = !query;
    if (needsAi && isAiConfigured) {
      const quota = await consumeQuota("ai");
      if (!quota.ok) return quota;

      const [resumes, strategy] = await Promise.all([
        listResumes().catch(() => []),
        getActiveStrategy().catch(() => null),
      ]);
      const resume = resumes.find((r) => r.label === input.resumeLabel);

      const params = await jobSearchParamsFromProfile({
        goalText: strategy?.goalText ?? undefined,
        resumeLabel: resume?.label,
        resumeNotes: resume?.notes ?? undefined,
        titles: input.titles,
        location: picked.label,
      });
      query = params.query || query;
    }

    if (!query) {
      return {
        ok: false,
        error: "Pick a job type, or a resume, so there is something to search.",
      };
    }

    const found = await searchJobListings({
      query,
      location,
      country,
      remote,
      filters,
    });
    // Sponsorship is judged from the returned text, so it can only be applied here.
    const listings = found.filter((row) =>
      passesSponsorshipFilter(row.sponsorship, filters.sponsorship)
    );
    return {
      ok: true,
      data: { listings, query, hidden: found.length - listings.length },
    };
  } catch (e) {
    return { ok: false, error: message(e, "Could not search jobs") };
  }
}

export async function saveListingAction(input: {
  title: string;
  company: string;
  url?: string;
  location?: string;
  resumeVersion?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!input.company.trim() || !input.title.trim()) {
      return { ok: false, error: "Company and role are required." };
    }

    const app = await createApplication(
      {
        company: input.company,
        role: input.title,
        jobUrl: input.url,
        location: input.location,
        resumeVersion: input.resumeVersion,
        track: guessTrack(`${input.title} ${input.company}`),
        status: "Wishlist",
        source: "Company site",
      },
      user.id
    );
    revalidatePath("/board");
    revalidatePath("/applications");
    revalidatePath("/jobs");
    return { ok: true, data: { id: app.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not save to the board") };
  }
}
