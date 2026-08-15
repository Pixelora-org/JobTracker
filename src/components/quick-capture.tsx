"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { captureAction, type CaptureDraft } from "@/lib/actions/capture";
import { ApplicationForm } from "@/components/application-form";
import { TouchpointForm } from "@/components/touchpoint-form";
import { Button, ErrorBanner, MicroLabel, Textarea } from "@/components/ui";
import type { ApplicationInput } from "@/lib/types";

export function QuickCapture({
  open,
  onClose,
  resumeOptions = [],
  onOffer,
}: {
  open: boolean;
  onClose: () => void;
  resumeOptions?: string[];
  onOffer?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [application, setApplication] = useState<{
    values: Partial<ApplicationInput>;
    extracted: boolean;
  } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const reset = useCallback(() => {
    setText("");
    setDraft(null);
    setApplication(null);
    setError(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  function extract() {
    setError(null);
    startTransition(async () => {
      const result = await captureAction(text);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.draft.kind === "application") {
        setDraft(null);
        setApplication({ values: result.draft.values, extracted: true });
        setFormKey((k) => k + 1);
        return;
      }
      setApplication(null);
      setDraft(result.draft);
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
        <button
          type="button"
          aria-label="Close overlay"
          className="fixed inset-0 bg-[#12151C]/40 backdrop-blur-[2px] animate-fade-in"
          onClick={close}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            application ? "app-form-title" : "quick-capture-title"
          }
          className="relative z-10 flex max-h-[calc(100vh-4rem)] w-full max-w-[800px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-20px_rgba(18,21,28,0.45)] animate-fade-in"
        >
          {application ? (
            <ApplicationForm
              key={formKey}
              initialValues={application.values}
              resumeOptions={resumeOptions}
              eyebrow="Quick add"
              title={
                application.extracted
                  ? "Does this look right?"
                  : "Add application"
              }
              onBack={reset}
              onClose={close}
              onOffer={onOffer}
            />
          ) : (
            <>
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <MicroLabel>Quick add</MicroLabel>
                  <h2
                    id="quick-capture-title"
                    className="mt-1 text-lg font-medium text-text"
                  >
                    {draft?.kind === "touchpoint"
                      ? "Outreach detected"
                      : "Paste anything"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {draft?.kind === "touchpoint"
                      ? draft.matchedCompany
                        ? `Linked to ${draft.matchedCompany}.`
                        : "No matching application, saving as a standalone contact."
                      : "A job posting, a cold email you sent, a LinkedIn note, or just a contact. It works out which one and fills the form."}
                  </p>
                </div>
                <Button type="button" variant="ghost" onClick={close}>
                  Close
                </Button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {error ? <ErrorBanner message={error} /> : null}

                {draft?.kind === "touchpoint" ? (
                  <div className="space-y-3">
                    <TouchpointForm
                      initialValues={draft.values}
                      applicationId={draft.values.applicationId}
                      submitLabel="Log outreach"
                      onDone={close}
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
                  <div className="space-y-4">
                    <Textarea
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        "Paste a job description, or something like:\n\n" +
                        "Sent a cold email to priya@acme.com about the Security Engineer role, remind me in 5 days"
                      }
                      className="min-h-[220px]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setApplication({ values: {}, extracted: false });
                          setFormKey((k) => k + 1);
                        }}
                        className="text-sm text-muted hover:text-text"
                      >
                        Fill the form manually instead
                      </button>
                      <Button type="button" onClick={extract} disabled={pending}>
                        {pending ? "Reading…" : "Extract"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
