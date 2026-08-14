"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveListingAction, searchJobsAction } from "@/lib/actions/jobs";
import type { JobListing } from "@/lib/jobs/search";
import {
  JOB_SEARCH_LOCATIONS,
  JOB_SEARCH_TYPES,
  jobTypeGroups,
  locationGroups,
} from "@/lib/jobs/filters";
import type { Resume } from "@/lib/types";
import {
  Button,
  ErrorBanner,
  Field,
  MicroLabel,
  Select,
} from "@/components/ui";

export function JobSearch({
  resumes,
  apiEnabled,
  aiEnabled,
}: {
  resumes: Resume[];
  apiEnabled: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [resumeLabel, setResumeLabel] = useState(resumes[0]?.label ?? "");
  const [titles, setTitles] = useState("");
  const [location, setLocation] = useState("remote");
  const [queryUsed, setQueryUsed] = useState("");
  const [listings, setListings] = useState<JobListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSearch(async () => {
      const result = await searchJobsAction({
        resumeLabel: resumeLabel || undefined,
        titles,
        location,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setListings(result.data.listings);
      setQueryUsed(result.data.query);
    });
  }

  function save(listing: JobListing) {
    setError(null);
    setSavingId(listing.id);
    startSave(async () => {
      const result = await saveListingAction({
        title: listing.title,
        company: listing.company,
        url: listing.url,
        location: listing.location,
        resumeVersion: resumeLabel || undefined,
      });
      setSavingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved((prev) => ({ ...prev, [listing.id]: result.data.id }));
      router.refresh();
    });
  }

  if (!apiEnabled) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
        Add ADZUNA_APP_ID and ADZUNA_APP_KEY, or RAPIDAPI_KEY, to .env.local to
        load listings.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} /> : null}

      <form
        onSubmit={search}
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <MicroLabel>Search</MicroLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Resume">
            <Select
              value={resumeLabel}
              onChange={(e) => setResumeLabel(e.target.value)}
            >
              <option value="">None</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Type"
            hint={
              aiEnabled
                ? "Pick one, or leave From resume and AI will guess."
                : "Required when AI is off."
            }
          >
            <Select
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
            >
              <option value="">
                {aiEnabled ? "From resume" : "Select a type"}
              </option>
              {jobTypeGroups().map((group) => (
                <optgroup key={group} label={group}>
                  {JOB_SEARCH_TYPES.filter((row) => row.group === group).map(
                    (row) => (
                      <option key={row.value} value={row.value}>
                        {row.label}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Location">
            <Select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {locationGroups().map((group) => (
                <optgroup key={group} label={group}>
                  {JOB_SEARCH_LOCATIONS.filter((row) => row.group === group).map(
                    (row) => (
                      <option key={row.value || "anywhere"} value={row.value}>
                        {row.label}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : aiEnabled ? "Find jobs" : "Search titles"}
          </Button>
        </div>
      </form>

      {queryUsed ? (
        <p className="font-mono text-[11px] text-muted">Query · {queryUsed}</p>
      ) : null}

      {listings.length === 0 && queryUsed ? (
        <p className="text-sm text-muted">No listings for that search.</p>
      ) : null}

      <ul className="space-y-2">
        {listings.map((listing) => {
          const savedId = saved[listing.id];
          return (
            <li
              key={listing.id}
              className="rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{listing.title}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {listing.company}
                    {listing.location ? ` · ${listing.location}` : ""}
                    {listing.remote ? " · Remote" : ""}
                  </p>
                  {listing.snippet ? (
                    <p className="mt-2 text-sm text-muted">{listing.snippet}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {listing.url ? (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-background"
                    >
                      Open
                    </a>
                  ) : null}
                  {savedId ? (
                    <a
                      href={`/applications/${savedId}`}
                      className="inline-flex h-8 items-center rounded-md bg-accent-soft px-3 text-sm text-accent"
                    >
                      On board
                    </a>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving && savingId === listing.id}
                      onClick={() => save(listing)}
                    >
                      {savingId === listing.id ? "Saving…" : "Save to board"}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
