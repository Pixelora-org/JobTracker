"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DossierLink } from "@/components/dossier-link";
import { dossierStatusStyle, dossierTitleStyle } from "@/lib/motion";
import { deleteApplicationAction } from "@/lib/actions/applications";
import { STATUS_COLORS } from "@/lib/constants";
import type { Application, Touchpoint } from "@/lib/types";
import { cn, daysSince, isStale } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell-provider";
import { groupTouchpointsByPerson } from "@/lib/people";
import { OutreachPanel } from "@/components/outreach-panel";
import { ShareJob } from "@/components/share-job";
import { TouchpointForm } from "@/components/touchpoint-form";
import { TouchpointTimeline } from "@/components/touchpoint-timeline";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Button,
  ErrorBanner,
  MicroLabel,
  StatusPill,
  TabBar,
} from "@/components/ui";

type Tab = "overview" | "outreach";

/**
 * The one line that says what to do next. Derived from fields we already store,
 * in order of urgency, so the page opens with an instruction rather than a wall.
 */
function nextAction(app: Application, touchpoints: Touchpoint[]) {
  const overdue = daysSince(app.nextActionDate);
  if (overdue !== null && overdue >= 0) {
    return {
      text:
        overdue === 0
          ? "Next action is due today."
          : `Next action is ${overdue}d overdue.`,
      urgent: true,
    };
  }
  if (app.nextActionDate) {
    return {
      text: `Next action on ${app.nextActionDate.slice(0, 10)}.`,
      urgent: false,
    };
  }
  if (touchpoints.length === 0) {
    return {
      text: "No outreach logged yet. Find someone worth emailing.",
      urgent: false,
    };
  }
  if (isStale(app)) {
    return {
      text: `No movement in ${daysSince(app.updatedAt)}d. Nudge it, or write it off.`,
      urgent: true,
    };
  }
  return { text: "Up to date. Nothing is waiting on you.", urgent: false };
}

export function ApplicationDetail({
  application,
  touchpoints,
  apolloEnabled,
  aiEnabled,
  friends,
  initialTab = "overview",
}: {
  application: Application;
  touchpoints: Touchpoint[];
  apolloEnabled: boolean;
  aiEnabled: boolean;
  friends: { userId: string; handle: string }[];
  initialTab?: Tab;
}) {
  const router = useRouter();
  const { openEditApplication } = useAppShell();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ kind: "application" } | null>(null);
  const stale = isStale(application);
  const days = daysSince(application.updatedAt);
  const action = nextAction(application, touchpoints);

  function pickTab(next: string) {
    const value: Tab = next === "outreach" ? "outreach" : "overview";
    setTab(value);
    window.history.replaceState(
      null,
      "",
      value === "overview"
        ? `/applications/${application.id}`
        : `/applications/${application.id}?tab=${value}`
    );
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteApplicationAction(application.id);
      if (!result.ok) {
        setConfirm(null);
        setError(result.error);
        return;
      }
      router.push("/board?view=table");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <DossierLink
            href="/board"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-text"
          >
            ← Board
          </DossierLink>
          <h1
            className="mt-2 text-2xl font-medium tracking-tight text-text"
            style={dossierTitleStyle(application.id)}
          >
            {application.company}
          </h1>
          <p className="mt-1 text-muted">{application.role}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill
              status={application.status}
              color={STATUS_COLORS[application.status]}
              style={dossierStatusStyle(application.id)}
            />
            <span className="font-mono text-[11px] text-muted">
              {application.track}
            </span>
            {stale ? (
              <span className="font-mono text-[10px] uppercase text-stale">
                stale · {days}d
              </span>
            ) : (
              <span className="font-mono text-[11px] text-muted">
                updated {days === null ? "-" : `${days}d`} ago
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <ShareJob
            applicationId={application.id}
            friends={friends}
            contactCount={groupTouchpointsByPerson(touchpoints).length}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => openEditApplication(application)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => setConfirm({ kind: "application" })}
          >
            Delete
          </Button>
        </div>
      </div>

      <p
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          action.urgent
            ? "border-stale/40 bg-stale-bg text-text"
            : "border-border bg-surface text-muted"
        )}
      >
        {action.text}
      </p>

      {error ? <ErrorBanner message={error} /> : null}

      <TabBar
        ariaLabel="Application sections"
        active={tab}
        onSelect={pickTab}
        items={[
          { id: "overview", label: "Overview" },
          {
            id: "outreach",
            label: "Outreach",
            badge: touchpoints.length || undefined,
          },
        ]}
      />

      {tab === "overview" ? (
        <section className="rounded-lg border border-border bg-surface p-4">
          <MicroLabel>Details</MicroLabel>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(
              [
                ["Source", application.source],
                ["Resume", application.resumeVersion || "-"],
                ["Location", application.location || "-"],
                ["Work mode", application.workMode || "-"],
                [
                  "Applied",
                  application.dateApplied
                    ? application.dateApplied.slice(0, 10)
                    : "-",
                ],
                [
                  "Next action",
                  application.nextActionDate
                    ? application.nextActionDate.slice(0, 10)
                    : "-",
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-text">{value}</dd>
              </div>
            ))}
          </dl>
          {application.jobUrl ? (
            <p className="mt-4 text-sm">
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Open job posting ↗
              </a>
            </p>
          ) : null}
          {application.notes ? (
            <div className="mt-4 border-t border-border pt-4">
              <MicroLabel>Notes</MicroLabel>
              <p
                className={cn(
                  "mt-2 whitespace-pre-wrap text-sm text-text",
                  !showFullNotes && "line-clamp-6"
                )}
              >
                {application.notes}
              </p>
              {application.notes.length > 320 ? (
                <button
                  type="button"
                  onClick={() => setShowFullNotes((v) => !v)}
                  className="mt-2 font-mono text-[11px] text-accent hover:underline"
                >
                  {showFullNotes ? "Show less" : "Show full posting"}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "outreach" ? (
        <div className="space-y-5">
          <OutreachPanel
            application={application}
            apolloEnabled={apolloEnabled}
            aiEnabled={aiEnabled}
          />
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium">Logged</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowManualForm((v) => !v)}
              >
                {showManualForm ? "Close" : "Log another"}
              </Button>
            </div>
            {showManualForm ? (
              <div className="rounded-lg border border-border bg-surface p-4">
                <TouchpointForm
                  applicationId={application.id}
                  defaultCompany={application.company}
                  allowPaste
                  aiEnabled={aiEnabled}
                  onDone={() => setShowManualForm(false)}
                />
              </div>
            ) : null}
            <TouchpointTimeline
              touchpoints={touchpoints}
              empty="Nothing logged for this role yet. Find someone above, or log a message you already sent."
            />
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete ${application.company}?`}
        description={`${application.role}. Logged outreach stays under Outreach, but is no longer tied to this role.`}
        busy={pending}
        onCancel={() => {
          if (!pending) setConfirm(null);
        }}
        onConfirm={onDelete}
      />
    </div>
  );
}
