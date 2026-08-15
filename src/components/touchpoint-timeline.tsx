"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTouchpointAction } from "@/lib/actions/touchpoints";
import { toDateInput } from "@/lib/dates";
import type { Touchpoint } from "@/lib/types";
import { daysSince } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TouchpointForm } from "@/components/touchpoint-form";
import { Button } from "@/components/ui";

export function TouchpointTimeline({
  touchpoints,
  applicationOptions,
  empty,
}: {
  touchpoints: Touchpoint[];
  applicationOptions?: { id: string; label: string }[];
  empty?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Touchpoint | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Touchpoint | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (touchpoints.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted">
        {empty ?? "Nothing logged yet."}
      </p>
    );
  }

  return (
    <>
      <ol className="space-y-2">
        {touchpoints.map((t) => {
          const overdue = !t.followUpDone ? daysSince(t.followUpDate) : null;
          return (
            <li
              key={t.id}
              className="rounded-lg border border-border bg-surface px-4 py-3"
            >
              {editing?.id === t.id ? (
                <TouchpointForm
                  touchpoint={t}
                  applicationOptions={applicationOptions}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">
                      {t.contactName}
                      {t.contactTitle ? (
                        <span className="ml-2 text-xs font-normal text-muted">
                          {t.contactTitle}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {t.channel} · {t.type} · {t.status} · {toDateInput(t.date)}
                    </p>
                    {t.contactEmail ? (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-accent">
                        {t.contactEmail}
                      </p>
                    ) : null}
                    {t.applicationId ? (
                      <Link
                        href={`/applications/${t.applicationId}`}
                        className="mt-1 inline-block font-mono text-[11px] text-accent hover:underline"
                      >
                        View role
                      </Link>
                    ) : null}
                    {overdue !== null && overdue >= 0 ? (
                      <p className="mt-1 font-mono text-[11px] text-stale">
                        {overdue === 0
                          ? "Follow-up due today"
                          : `Follow-up ${overdue}d overdue`}
                      </p>
                    ) : t.followUpDate && !t.followUpDone ? (
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        Follow up {toDateInput(t.followUpDate)}
                      </p>
                    ) : null}
                    {t.notes ? (
                      <p className="mt-2 line-clamp-3 text-sm text-muted">
                        {t.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busyId === t.id}
                      onClick={() => setPendingDelete(t)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? `Delete the ${pendingDelete.channel.toLowerCase()} to ${pendingDelete.contactName}?`
            : "Delete outreach?"
        }
        description="The reminder on this message goes too. The person stays in your directory."
        busy={busyId === pendingDelete?.id}
        onCancel={() => {
          if (!busyId) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          setBusyId(pendingDelete.id);
          startTransition(async () => {
            const result = await deleteTouchpointAction(
              pendingDelete.id,
              pendingDelete.applicationId
            );
            setBusyId(null);
            setPendingDelete(null);
            if (result.ok) router.refresh();
          });
        }}
      />
    </>
  );
}
