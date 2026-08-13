"use client";

import { useEffect, useState, useTransition } from "react";
import { captureAction, type CaptureDraft } from "@/lib/actions/capture";
import { TouchpointForm } from "@/components/touchpoint-form";
import { Button, ErrorBanner, MicroLabel, Textarea } from "@/components/ui";

export function QuickCapture({
  open,
  onClose,
  onApplicationDraft,
  onManual,
}: {
  open: boolean;
  onClose: () => void;
  onApplicationDraft: (draft: CaptureDraft & { kind: "application" }) => void;
  onManual: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function reset() {
    setText("");
    setDraft(null);
    setError(null);
  }

  function extract() {
    setError(null);
    startTransition(async () => {
      const result = await captureAction(text);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.draft.kind === "application") {
        onApplicationDraft(result.draft);
        reset();
        return;
      }
      setDraft(result.draft);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 bg-[#12151C]/30 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-capture-title"
        className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-surface animate-fade-in"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <MicroLabel>Quick add</MicroLabel>
            <h2
              id="quick-capture-title"
              className="mt-1 text-lg font-medium text-text"
            >
              Paste anything
            </h2>
            <p className="mt-1 text-sm text-muted">
              A job posting, a cold email you sent, a LinkedIn note, or just a
              contact. It works out which one and fills the form.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="space-y-4 px-5 py-4">
          {error ? <ErrorBanner message={error} /> : null}

          {draft?.kind === "touchpoint" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <MicroLabel>Outreach detected</MicroLabel>
                {draft.matchedCompany ? (
                  <span className="font-mono text-[11px] text-accent">
                    linked to {draft.matchedCompany}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-muted">
                    no matching application, saving as a standalone contact
                  </span>
                )}
              </div>
              <TouchpointForm
                initialValues={draft.values}
                applicationId={draft.values.applicationId}
                submitLabel="Log outreach"
                onDone={() => {
                  reset();
                  onClose();
                }}
              />
              <button
                type="button"
                onClick={reset}
                className="text-sm text-muted hover:text-text"
              >
                ← Paste something else
              </button>
            </div>
          ) : (
            <>
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "Paste a job description, or something like:\n\n" +
                  "Sent a cold email to priya@acme.com about the Security Engineer role, remind me in 5 days"
                }
                className="min-h-[180px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onManual();
                    reset();
                  }}
                  className="text-sm text-muted hover:text-text"
                >
                  Fill the form manually instead
                </button>
                <Button type="button" onClick={extract} disabled={pending}>
                  {pending ? "Reading…" : "Extract"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
