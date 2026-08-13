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
import { cn } from "@/lib/utils";

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

function ApplicationFormBody({
  application,
  initialValues,
  resumeOptions = [],
  onClose,
}: {
  application?: Application | null;
  initialValues?: Partial<ApplicationInput>;
  resumeOptions?: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ApplicationInput>(() =>
    defaults(application, initialValues)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(application);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          ? new Date(form.dateApplied).toISOString()
          : undefined,
        nextActionDate: form.nextActionDate
          ? new Date(form.nextActionDate).toISOString()
          : undefined,
      };

      const result = isEdit
        ? await updateApplicationAction(application!.id, payload)
        : await createApplicationAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-form-title"
      className={cn(
        "relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-none animate-slide-in-right"
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            {isEdit ? "Edit" : "New"}
          </p>
          <h2 id="app-form-title" className="text-lg font-medium text-text">
            {isEdit ? "Edit application" : "Add application"}
          </h2>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>

      <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? <ErrorBanner message={error} /> : null}
          <div className="grid grid-cols-1 gap-4">
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <Field label="Job URL">
              <Input
                type="url"
                value={form.jobUrl}
                onChange={(e) => set("jobUrl", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Recruiter name, referral path, interview notes…"
              />
            </Field>
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add application"}
          </Button>
        </footer>
      </form>
    </aside>
  );
}

export function ApplicationSlideOver({
  open,
  application,
  initialValues,
  resumeOptions,
  onClose,
}: {
  open: boolean;
  application?: Application | null;
  initialValues?: Partial<ApplicationInput>;
  resumeOptions?: string[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#12151C]/30 animate-fade-in"
        onClick={onClose}
      />
      <ApplicationFormBody
        key={application?.id ?? "new"}
        application={application}
        initialValues={initialValues}
        resumeOptions={resumeOptions}
        onClose={onClose}
      />
    </div>
  );
}
