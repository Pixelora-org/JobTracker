"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureAction } from "@/lib/actions/capture";
import {
  createTouchpointAction,
  updateTouchpointAction,
} from "@/lib/actions/touchpoints";
import { DEFAULT_FOLLOW_UP_DAYS } from "@/lib/constants";
import { addDaysInput, dateInputToIso, toDateInput, todayInput } from "@/lib/dates";
import {
  CHANNELS,
  TOUCHPOINT_STATUSES,
  TOUCHPOINT_TYPES,
  type Channel,
  type Touchpoint,
  type TouchpointInput,
  type TouchpointStatus,
  type TouchpointType,
} from "@/lib/types";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "@/components/ui";

type ApplicationOption = { id: string; label: string };

function emptyForm(
  applicationId?: string,
  defaultCompany = "",
  initialValues?: Partial<TouchpointInput>
): TouchpointInput {
  const date = initialValues?.date
    ? toDateInput(initialValues.date)
    : todayInput();
  const followUp = initialValues?.followUpDate
    ? toDateInput(initialValues.followUpDate)
    : addDaysInput(date, DEFAULT_FOLLOW_UP_DAYS);
  return {
    applicationId: applicationId || initialValues?.applicationId,
    contactName: initialValues?.contactName ?? "",
    company: initialValues?.company ?? defaultCompany,
    channel: initialValues?.channel ?? "LinkedIn",
    type: initialValues?.type ?? "Cold outreach",
    date,
    status: initialValues?.status ?? "Sent",
    notes: initialValues?.notes ?? "",
    followUpDate: followUp,
    contactEmail: initialValues?.contactEmail ?? "",
    contactTitle: initialValues?.contactTitle ?? "",
    contactLinkedinUrl: initialValues?.contactLinkedinUrl ?? "",
  };
}

function fromTouchpoint(t: Touchpoint): TouchpointInput {
  return {
    applicationId: t.applicationId ?? undefined,
    contactId: t.contactId ?? undefined,
    contactName: t.contactName,
    company: t.company,
    channel: t.channel,
    type: t.type,
    date: toDateInput(t.date),
    status: t.status,
    notes: t.notes ?? "",
    followUpDate: t.followUpDate ? toDateInput(t.followUpDate) : "",
    contactEmail: t.contactEmail ?? "",
    contactTitle: t.contactTitle ?? "",
    contactLinkedinUrl: t.contactLinkedinUrl ?? "",
  };
}

export function TouchpointForm({
  applicationId,
  defaultCompany = "",
  initialValues,
  applicationOptions,
  submitLabel,
  onDone,
  allowPaste = false,
  aiEnabled = false,
  touchpoint,
}: {
  applicationId?: string;
  defaultCompany?: string;
  initialValues?: Partial<TouchpointInput>;
  applicationOptions?: ApplicationOption[];
  submitLabel?: string;
  onDone?: () => void;
  allowPaste?: boolean;
  aiEnabled?: boolean;
  touchpoint?: Touchpoint;
}) {
  const router = useRouter();
  const isEdit = Boolean(touchpoint);
  const [pending, startTransition] = useTransition();
  const [extracting, startExtract] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [followUpLocked, setFollowUpLocked] = useState(
    Boolean(touchpoint?.followUpDate || initialValues?.followUpDate)
  );
  const [form, setForm] = useState<TouchpointInput>(() =>
    touchpoint
      ? fromTouchpoint(touchpoint)
      : emptyForm(applicationId, defaultCompany, initialValues)
  );

  function set<K extends keyof TouchpointInput>(
    key: K,
    value: TouchpointInput[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "date" && !followUpLocked && typeof value === "string") {
        next.followUpDate = addDaysInput(value, DEFAULT_FOLLOW_UP_DAYS);
      }
      return next;
    });
  }

  function extract() {
    setError(null);
    startExtract(async () => {
      const result = await captureAction(paste);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.draft.kind !== "touchpoint") {
        setError(
          "That looks like a job posting. Use Quick add on the board to save a role."
        );
        return;
      }
      const values = result.draft.values;
      const date = values.date ? toDateInput(values.date) : todayInput();
      const followUp = values.followUpDate
        ? toDateInput(values.followUpDate)
        : addDaysInput(date, DEFAULT_FOLLOW_UP_DAYS);
      setFollowUpLocked(Boolean(values.followUpDate));
      setForm((prev) => ({
        ...prev,
        ...values,
        date,
        followUpDate: followUp,
        applicationId: applicationId || values.applicationId || prev.applicationId,
        company: values.company || prev.company || defaultCompany,
      }));
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload: TouchpointInput = {
        ...form,
        applicationId: applicationId || form.applicationId,
        date: dateInputToIso(form.date),
        followUpDate: form.followUpDate
          ? dateInputToIso(form.followUpDate)
          : undefined,
      };
      const result = isEdit
        ? await updateTouchpointAction(touchpoint!.id, payload)
        : await createTouchpointAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!isEdit) {
        setForm(emptyForm(applicationId, defaultCompany));
        setPaste("");
        setFollowUpLocked(false);
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <ErrorBanner message={error} /> : null}

      {allowPaste && !isEdit ? (
        <div className="space-y-2">
          <Field
            label="Paste a message"
            hint={
              aiEnabled
                ? "An email, LinkedIn note, or a name and address. Extract fills the fields."
                : "AI is off, so fill the fields below."
            }
          >
            <Textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={
                "Paste something like:\n\nHi Priya — following up on the Security Engineer role at Acme.\npriya@acme.com"
              }
              className="min-h-[88px]"
            />
          </Field>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!aiEnabled || extracting || !paste.trim()}
              onClick={extract}
            >
              {extracting ? "Reading…" : "Extract"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Contact">
          <Input
            required
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Jordan Lee"
          />
        </Field>
        <Field label="Company">
          <Input
            required
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Acme Corp"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.contactEmail ?? ""}
            onChange={(e) => set("contactEmail", e.target.value)}
            placeholder="jordan@acme.com"
          />
        </Field>
        <Field label="LinkedIn URL">
          <Input
            type="url"
            value={form.contactLinkedinUrl ?? ""}
            onChange={(e) => set("contactLinkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field label="Title">
          <Input
            value={form.contactTitle ?? ""}
            onChange={(e) => set("contactTitle", e.target.value)}
            placeholder="Technical Recruiter"
          />
        </Field>
        <Field label="Channel">
          <Select
            value={form.channel}
            onChange={(e) => set("channel", e.target.value as Channel)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select
            value={form.type}
            onChange={(e) => set("type", e.target.value as TouchpointType)}
          >
            {TOUCHPOINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => set("status", e.target.value as TouchpointStatus)}
          >
            {TOUCHPOINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date sent">
          <Input
            type="date"
            className="font-mono"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field
          label="Follow up on"
          hint={
            followUpLocked
              ? undefined
              : `${DEFAULT_FOLLOW_UP_DAYS} days after the sent date`
          }
        >
          <Input
            type="date"
            className="font-mono"
            value={form.followUpDate ?? ""}
            onChange={(e) => {
              setFollowUpLocked(true);
              set("followUpDate", e.target.value);
            }}
          />
        </Field>
        {applicationOptions ? (
          <Field label="Linked application">
            <Select
              value={form.applicationId ?? ""}
              onChange={(e) => set("applicationId", e.target.value)}
            >
              <option value="">Standalone contact</option>
              {applicationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="What you said / asked for…"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : submitLabel ?? (isEdit ? "Save changes" : "Log outreach")}
        </Button>
      </div>
    </form>
  );
}
