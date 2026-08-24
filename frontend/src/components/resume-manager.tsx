"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import {
  createResumeAction,
  deleteResumeAction,
  resumeDownloadUrlAction,
} from "@/lib/actions/resumes";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { RESUME_BUCKET, type Resume } from "@/lib/types";
import type { ResumeInsight, ResumeVersionStats } from "@/lib/resume-stats";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, ErrorBanner, Field, Input, MicroLabel, Textarea } from "@/components/ui";

const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

function addedOn(iso: string) {
  const date = parseISO(iso);
  return isValid(date) ? format(date, "d MMM yyyy") : iso.slice(0, 10);
}

function fileKind(name: string) {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-lg font-medium tabular-nums",
          accent ? "text-accent" : "text-text"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
    </div>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function ResumeManager({
  userId,
  resumes,
  stats,
  insight,
}: {
  userId: string;
  resumes: Resume[];
  stats: ResumeVersionStats[];
  insight: ResumeInsight;
}) {
  const router = useRouter();
  const { session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 10 MB.");
      return;
    }
    if (!label.trim()) {
      setError("Give this version a name, e.g. Security v2.");
      return;
    }

    setUploading(true);
    const supabase = createClient(async () => session?.getToken() ?? null);
    const filePath = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(filePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const result = await createResumeAction({
      label,
      fileName: file.name,
      filePath,
      sizeBytes: file.size,
      notes,
    });

    setUploading(false);

    if (!result.ok) {
      // Don't leave the file behind if the record failed to save.
      await supabase.storage.from(RESUME_BUCKET).remove([filePath]);
      setError(result.error);
      return;
    }

    setLabel("");
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  function download(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await resumeDownloadUrlAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function remove(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await deleteResumeAction(id);
      setBusyId(null);
      setPendingDelete(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} /> : null}

      <form
        onSubmit={upload}
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <MicroLabel>Upload a version</MicroLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Version name" hint="Use this name in the resume field on applications.">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Security v2"
              required
            />
          </Field>
          <Field label="File" hint="PDF or Word, up to 10 MB.">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              required
              className="h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted file:mr-3 file:rounded file:border-0 file:bg-accent-soft file:px-2 file:py-1 file:text-xs file:text-accent"
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What's different about this one: keywords, ordering, target roles…"
            className="min-h-[64px]"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Save version"}
          </Button>
        </div>
      </form>

      {insight ? (
        <div className="rounded-lg border border-accent/25 bg-accent-soft/40 px-4 py-3 text-sm text-text">
          <span className="font-medium">{insight.better}</span>
          {" gets screens at "}
          <span className="font-medium">{insight.multiple}x</span>
          {" the rate of "}
          <span className="font-medium">{insight.worse}</span>
          {". Based on current stage. Need 5+ sent on each version to compare."}
        </div>
      ) : null}

      {resumes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
          <h2 className="text-base font-medium">No resume versions yet</h2>
          <p className="mt-1 text-sm text-muted">
            Upload the versions you actually send, then reference them by name
            when logging an application.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {resumes.map((resume) => {
            const row = stats.find((s) => s.label === resume.label);
            const sent = row?.sent ?? 0;
            const screens = row?.screens ?? 0;
            const interviews = row?.interviews ?? 0;
            const busy = busyId === resume.id;
            return (
              <li
                key={resume.id}
                className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border/80"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text">
                        {resume.label}
                      </p>
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
                        {fileKind(resume.fileName)} · {formatBytes(resume.sizeBytes)}
                      </span>
                    </div>

                    {sent > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
                        <Stat value={sent} label="Sent" />
                        <Stat value={screens} label="Screens" />
                        <Stat value={interviews} label="Interviews" />
                        <Stat
                          accent
                          value={`${Math.round((screens / sent) * 100)}%`}
                          label="Screen rate"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        Not sent yet. Pick{" "}
                        <span className="text-text">{resume.label}</span> in the
                        resume field when you log an application and the numbers
                        show up here.
                      </p>
                    )}

                    {resume.notes ? (
                      <p className="mt-3 text-sm text-muted">{resume.notes}</p>
                    ) : null}

                    <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 font-mono text-[11px] text-muted">
                      <FileIcon />
                      <span className="truncate">{resume.fileName}</span>
                      <span className="shrink-0">
                        · {addedOn(resume.createdAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => download(resume.id)}
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        setPendingDelete({ id: resume.id, name: resume.label })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? `Delete ${pendingDelete.name}?`
            : "Delete resume?"
        }
        description="The file is removed from storage too. Applications that already used this version keep the name."
        busy={busyId === pendingDelete?.id}
        onCancel={() => {
          if (!busyId) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete.id);
        }}
      />
    </div>
  );
}
