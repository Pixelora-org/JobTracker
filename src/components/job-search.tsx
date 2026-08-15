"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { deleteApplicationAction } from "@/lib/actions/applications";
import { saveListingAction, searchJobsAction } from "@/lib/actions/jobs";
import type { JobListing } from "@/lib/jobs/search";
import {
  DATE_POSTED,
  DEFAULT_JOB_FILTERS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  JOB_SEARCH_LOCATIONS,
  JOB_SEARCH_TYPES,
  SALARY_MINIMUMS,
  SORT_OPTIONS,
  SPONSORSHIP_FILTERS,
  jobTypeGroups,
  locationGroups,
  type JobFilters,
} from "@/lib/jobs/filters";
import { sponsorshipLabel, type SponsorshipSignal } from "@/lib/jobs/sponsorship";
import { staggerStyle } from "@/lib/motion";
import type { Resume } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Button,
  ErrorBanner,
  Field,
  MicroLabel,
  Select,
  StatusPill,
} from "@/components/ui";

const SPONSORSHIP_COLOR: Record<SponsorshipSignal, string> = {
  sponsors: "#1F7A5C",
  likely: "#2F4FE0",
  blocked: "#9B2C3D",
  unknown: "#6B7280",
};

function postedAgo(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${formatDistanceToNowStrict(date)} ago`;
}

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
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [queryUsed, setQueryUsed] = useState("");
  const [hidden, setHidden] = useState(0);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    listingId: string;
    applicationId: string;
    title: string;
    company: string;
  } | null>(null);

  const filtersChanged =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_JOB_FILTERS);

  function set<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSearch(async () => {
      const result = await searchJobsAction({
        resumeLabel: resumeLabel || undefined,
        titles,
        location,
        filters,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setListings(result.data.listings);
      setQueryUsed(result.data.query);
      setHidden(result.data.hidden);
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

  function unsave(listingId: string, applicationId: string) {
    setError(null);
    setSavingId(listingId);
    startSave(async () => {
      const result = await deleteApplicationAction(applicationId);
      setSavingId(null);
      if (!result.ok) {
        setPendingRemove(null);
        setError(result.error);
        return;
      }
      setSaved((prev) => {
        const next = { ...prev };
        delete next[listingId];
        return next;
      });
      setPendingRemove(null);
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
        className="space-y-4 rounded-lg border border-border bg-surface p-4"
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
            <Select value={titles} onChange={(e) => setTitles(e.target.value)}>
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

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <MicroLabel>Filters</MicroLabel>
            {filtersChanged ? (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_JOB_FILTERS)}
                className="text-xs text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Experience">
              <Select
                value={filters.experience}
                onChange={(e) => set("experience", e.target.value)}
              >
                {EXPERIENCE_LEVELS.map((row) => (
                  <option key={row.value || "any"} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employment">
              <Select
                value={filters.employment}
                onChange={(e) => set("employment", e.target.value)}
              >
                {EMPLOYMENT_TYPES.map((row) => (
                  <option key={row.value || "any"} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Posted">
              <Select
                value={filters.datePosted}
                onChange={(e) => set("datePosted", e.target.value)}
              >
                {DATE_POSTED.map((row) => (
                  <option key={row.value || "any"} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Visa sponsorship"
              hint="A guess from the wording and the employer's H-1B history."
            >
              <Select
                value={filters.sponsorship}
                onChange={(e) => set("sponsorship", e.target.value)}
              >
                {SPONSORSHIP_FILTERS.map((row) => (
                  <option key={row.value || "any"} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Minimum salary"
              hint="Hides ads that list no salary."
            >
              <Select
                value={filters.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
              >
                {SALARY_MINIMUMS.map((row) => (
                  <option key={row.value || "any"} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort by">
              <Select
                value={filters.sortBy}
                onChange={(e) => set("sortBy", e.target.value)}
              >
                {SORT_OPTIONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : aiEnabled ? "Find jobs" : "Search titles"}
          </Button>
        </div>
      </form>

      {queryUsed ? (
        <p className="font-mono text-[11px] text-muted">
          Query · {queryUsed}
          {hidden > 0 ? ` · ${hidden} hidden by sponsorship filter` : ""}
        </p>
      ) : null}

      {listings.length === 0 && queryUsed ? (
        <p className="text-sm text-muted">
          No listings for that search. Try widening the filters.
        </p>
      ) : null}

      <ul key={queryUsed} className="stagger-in space-y-2">
        {listings.map((listing, i) => {
          const savedId = saved[listing.id];
          const badge = sponsorshipLabel(listing.sponsorship);
          const posted = postedAgo(listing.postedAt);
          return (
            <li
              key={listing.id}
              style={staggerStyle(i)}
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {badge ? (
                      <StatusPill
                        status={badge}
                        color={SPONSORSHIP_COLOR[listing.sponsorship]}
                      />
                    ) : null}
                    {listing.salary ? (
                      <span className="font-mono text-[11px] text-muted">
                        {listing.salary}
                      </span>
                    ) : null}
                    {listing.employment ? (
                      <span className="font-mono text-[11px] text-muted">
                        {listing.employment}
                      </span>
                    ) : null}
                    {posted ? (
                      <span className="font-mono text-[11px] text-muted">
                        {posted}
                      </span>
                    ) : null}
                  </div>
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
                    <>
                      <a
                        href={`/applications/${savedId}`}
                        className="inline-flex h-8 items-center rounded-md bg-accent-soft px-3 text-sm text-accent"
                      >
                        On board
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving && savingId === listing.id}
                        onClick={() =>
                          setPendingRemove({
                            listingId: listing.id,
                            applicationId: savedId,
                            title: listing.title,
                            company: listing.company,
                          })
                        }
                      >
                        {savingId === listing.id ? "Removing…" : "Remove"}
                      </Button>
                    </>
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

      <ConfirmDialog
        open={pendingRemove !== null}
        title={
          pendingRemove
            ? `Remove ${pendingRemove.company}?`
            : "Remove from board?"
        }
        description={
          pendingRemove
            ? `${pendingRemove.title} comes off the board. You can save it again from this list.`
            : ""
        }
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={saving && savingId === pendingRemove?.listingId}
        onCancel={() => {
          if (!(saving && savingId === pendingRemove?.listingId)) {
            setPendingRemove(null);
          }
        }}
        onConfirm={() => {
          if (pendingRemove) {
            unsave(pendingRemove.listingId, pendingRemove.applicationId);
          }
        }}
      />
    </div>
  );
}
