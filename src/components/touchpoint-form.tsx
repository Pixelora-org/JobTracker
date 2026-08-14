"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTouchpointAction } from "@/lib/actions/touchpoints";
import { DEFAULT_FOLLOW_UP_DAYS } from "@/lib/constants";
import {
  CHANNELS,
  TOUCHPOINT_STATUSES,
  TOUCHPOINT_TYPES,
  type Channel,
  type TouchpointInput,
  type TouchpointStatus,
  type TouchpointType,
} from "@/lib/types";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "@/components/ui";

type ApplicationOption = { id: string; label: string };

function defaultFollowUp() {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_FOLLOW_UP_DAYS);
  return d.toISOString().slice(0, 10);
}

export function TouchpointForm({
  applicationId,
  defaultCompany = "",
  initialValues,
  applicationOptions,
  submitLabel = "Add touchpoint",
  onDone,
}: {
  applicationId?: string;
  defaultCompany?: string;
  initialValues?: Partial<TouchpointInput>;
  applicationOptions?: ApplicationOption[];
  submitLabel?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TouchpointInput>({
    applicationId,
    contactName: "",
    company: defaultCompany,
    channel: "LinkedIn",
    type: "Cold outreach",
    date: new Date().toISOString().slice(0, 10),
    status: "Sent",
    notes: "",
    followUpDate: defaultFollowUp(),
    ...initialValues,
  });

  function set<K extends keyof TouchpointInput>(key: K, value: TouchpointInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTouchpointAction({
        ...form,
        applicationId: applicationId || form.applicationId,
        date: new Date(form.date).toISOString(),
        followUpDate: form.followUpDate
          ? new Date(form.followUpDate).toISOString()
          : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm((prev) => ({
        ...prev,
        contactName: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
        followUpDate: defaultFollowUp(),
      }));
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      {error ? <ErrorBanner message={error} /> : null}
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
        <Field label="Date sent">
          <Input
            type="date"
            className="font-mono"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="Follow up on">
          <Input
            type="date"
            className="font-mono"
            value={form.followUpDate ?? ""}
            onChange={(e) => set("followUpDate", e.target.value)}
          />
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
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
