"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeFollowUpAction,
  snoozeFollowUpAction,
} from "@/lib/actions/touchpoints";
import type { Touchpoint } from "@/lib/types";
import { cn, daysSince } from "@/lib/utils";
import { Button, ErrorBanner, MicroLabel } from "@/components/ui";

export function FollowUpList({ touchpoints }: { touchpoints: Touchpoint[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await fn();
      setPendingId(null);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  if (touchpoints.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
        <h2 className="text-base font-medium">Nothing due</h2>
        <p className="mt-1 text-sm text-muted">
          Follow-ups appear here once an outreach reminder date arrives.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <ErrorBanner message={error} /> : null}
      <ul className="space-y-2">
        {touchpoints.map((t) => {
          const overdueBy = daysSince(t.followUpDate);
          const busy = pendingId === t.id;
          return (
            <li
              key={t.id}
              className={cn(
                "rounded-lg border bg-surface px-4 py-3",
                overdueBy && overdueBy > 0
                  ? "border-stale/40 bg-stale-bg"
                  : "border-border"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{t.contactName}</p>
                    <span className="font-mono text-[11px] text-muted">
                      {t.company}
                    </span>
                    {t.applicationId ? (
                      <Link
                        href={`/applications/${t.applicationId}`}
                        className="font-mono text-[11px] text-accent hover:underline"
                      >
                        view role
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {t.channel} · {t.type} · sent {t.date.slice(0, 10)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-stale">
                    {overdueBy && overdueBy > 0
                      ? `${overdueBy}d overdue`
                      : "due today"}
                  </p>
                  {t.notes ? (
                    <p className="mt-2 text-sm text-muted">{t.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(t.id, () => snoozeFollowUpAction(t.id, 3))
                    }
                  >
                    Snooze 3d
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(t.id, () => completeFollowUpAction(t.id))}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <MicroLabel>
        {touchpoints.length} open follow-up{touchpoints.length === 1 ? "" : "s"}
      </MicroLabel>
    </div>
  );
}
