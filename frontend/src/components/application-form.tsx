"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createApplicationAction,
  updateApplicationAction,
} from "@/lib/actions/applications";
import {
  SOURCES,
  STATUSES,
  TRACKS,
  WORK_MODES,
  type Application,
  type ApplicationInput,
  type Source,
  type Status,
  type Track,
  type WorkMode,
} from "@/lib/types";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "@/components/ui";
import { dateInputToIso } from "@/lib/dates";

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function defaults(
  app?: Application | null,
  initialValues?: Partial<ApplicationInput>
): ApplicationInput {
  return {
    ...baseDefaults(app),
    ...initialValues,
  };
}

function baseDefaults(app?: Application | null): ApplicationInput {
  return {
    company: app?.company ?? "",
    role: app?.role ?? "",
    jobUrl: app?.jobUrl ?? "",
    track: app?.track ?? "Software Engineering",
    resumeVersion: app?.resumeVersion ?? "",
    status: app?.status ?? "Applied",
    source: app?.source ?? "LinkedIn",
    location: app?.location ?? "",
    workMode: app?.workMode ?? "",
    dateApplied:
      toDateInput(app?.dateApplied) || toDateInput(new Date().toISOString()),
    nextActionDate: toDateInput(app?.nextActionDate),
    notes: app?.notes ?? "",
  };
}

export function ApplicationForm({
  application,
  initialValues,
  resumeOptions = [],
  eyebrow,
  title,
  onBack,
  onClose,
  onOffer,
}: {
  application?: Application | null;
  initialValues?: Partial<ApplicationInput>;
  resumeOptions?: string[];
  eyebrow?: string;
  title?: string;
  onBack?: () => void;
  onClose: () => void;
  onOffer?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ApplicationInput>(() =>
    defaults(application, initialValues)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(application);
  const heading = title ?? (isEdit ? "Edit application" : "Add application");
  const kicker = eyebrow ?? (isEdit ? "Edit" : "New");

  function set<K extends keyof ApplicationInput>(
    key: K,
    value: ApplicationInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload: ApplicationInput = {
        ...form,
        dateApplied: form.dateApplied
          ? dateInputToIso(form.dateApplied)
          : undefined,
        nextActionDate: form.nextActionDate
          ? dateInputToIso(form.nextActionDate)
          : undefined,
      };

      const result = isEdit
        ? await updateApplicationAction(application!.id, payload)
        : await createApplicationAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (payload.status === "Offer" && application?.status !== "Offer") {
        onOffer?.();
      }
      onClose();
      if (!isEdit && result.ok && result.data && "id" in result.data) {
        router.push(`/applications/${result.data.id}?tab=outreach`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            {kicker}
          </p>
          <h2 id="app-form-title" className="mt-1 text-lg font-medium text-text">
            {heading}
          </h2>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-2 text-sm text-muted hover:text-text"
            >
              ← Paste something else
            </button>
          ) : null}
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error ? <ErrorBanner message={error} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company">
              <Input
                required
                autoFocus
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Acme Corp"
              />
            </Field>
            <Field label="Role">
              <Input
                required
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Security Engineer"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as Status)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Track">
              <Select
                value={form.track}
                onChange={(e) => set("track", e.target.value as Track)}
              >
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source">
              <Select
                value={form.source}
                onChange={(e) => set("source", e.target.value as Source)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Resume version">
              <Input
                list="resume-versions"
                value={form.resumeVersion}
                onChange={(e) => set("resumeVersion", e.target.value)}
                placeholder="Security v2"
              />
              <datalist id="resume-versions">
                {resumeOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="NYC / Remote"
              />
            </Field>
            <Field label="Work mode">
              <Select
                value={form.workMode ?? ""}
                onChange={(e) =>
                  set("workMode", e.target.value as WorkMode | "")
                }
              >
                <option value="">-</option>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date applied">
              <Input
                type="date"
                className="font-mono"
                value={form.dateApplied}
                onChange={(e) => set("dateApplied", e.target.value)}
              />
            </Field>
            <Field label="Next action">
              <Input
                type="date"
                className="font-mono"
                value={form.nextActionDate}
                onChange={(e) => set("nextActionDate", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Job URL">
                <Input
                  type="url"
                  value={form.jobUrl}
                  onChange={(e) => set("jobUrl", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Recruiter name, referral path, interview notes…"
                />
              </Field>
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add application"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

export function ApplicationDialog({
  open,
  application,
  initialValues,
  resumeOptions,
  onClose,
  onOffer,
}: {
  open: boolean;
  application?: Application | null;
  initialValues?: Partial<ApplicationInput>;
  resumeOptions?: string[];
  onClose: () => void;
  onOffer?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
        <button
          type="button"
          aria-label="Close overlay"
          className="fixed inset-0 bg-[#12151C]/40 backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-form-title"
          className="relative z-10 flex max-h-[calc(100vh-4rem)] w-full max-w-[800px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-20px_rgba(18,21,28,0.45)] animate-fade-in"
        >
          <ApplicationForm
            key={application?.id ?? "new"}
            application={application}
            initialValues={initialValues}
            resumeOptions={resumeOptions}
            onClose={onClose}
            onOffer={onOffer}
          />
        </div>
      </div>
    </div>
  );
}
