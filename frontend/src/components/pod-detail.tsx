"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePodAction, inviteToPodAction, leavePodAction } from "@/lib/actions/pods";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { STATUS_COLORS } from "@/lib/constants";
import type { Pod, PodJob, PodJobSave, PodMember } from "@/lib/types";
import { Button, ErrorBanner, Input, MicroLabel, StatusPill } from "@/components/ui";

export function PodDetail({
  userId,
  pod,
  members,
  jobs,
  saves,
  friends = [],
}: {
  userId: string;
  pod: Pod;
  members: PodMember[];
  jobs: PodJob[];
  saves: PodJobSave[];
  friends?: { userId: string; handle: string }[];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const accepted = members.filter((m) => m.status === "accepted");
  const waiting = members.filter((m) => m.status === "pending");
  const mine = members.find((m) => m.userId === userId);
  const isCreator = pod.createdBy === userId;
  const savesByJob = new Map<string, PodJobSave[]>();
  for (const s of saves) {
    const list = savesByJob.get(s.podJobId) ?? [];
    list.push(s);
    savesByJob.set(s.podJobId, list);
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteToPodAction({ podId: pod.id, handle });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHandle("");
      router.refresh();
    });
  }

  function leave() {
    if (!mine || isCreator) return;
    setError(null);
    startTransition(async () => {
      const result = await leavePodAction(mine.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/pods");
      router.refresh();
    });
  }

  function removePod() {
    setError(null);
    startTransition(async () => {
      const result = await deletePodAction(pod.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmDelete(false);
      router.push("/pods");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/pods"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-text"
          >
            ← Pods
          </Link>
          <h1 className="mt-2 text-xl font-medium tracking-tight">{pod.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Shared list. Your board stays yours. Status is the headline; chat
            is on each job.
          </p>
        </div>
        {isCreator ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            Delete pod
          </Button>
        ) : mine ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={leave}>
            Leave
          </Button>
        ) : null}
      </div>

      <section className="rounded-lg border border-border bg-surface px-4 py-3">
        <MicroLabel>People · {accepted.length}/5</MicroLabel>
        <p className="mt-2 text-sm text-text">
          {accepted.map((m) => (m.handle ? `@${m.handle}` : "member")).join(" · ")}
        </p>
        {waiting.length > 0 ? (
          <p className="mt-1 font-mono text-[11px] text-muted">
            Waiting: {waiting.map((m) => (m.handle ? `@${m.handle}` : "invite")).join(", ")}
          </p>
        ) : null}
        {friends.filter((f) => !members.some((m) => m.userId === f.userId))
          .length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {friends
              .filter((f) => !members.some((m) => m.userId === f.userId))
              .map((f) => (
                <Button
                  key={f.userId}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending || accepted.length >= 5}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await inviteToPodAction({
                        podId: pod.id,
                        friendUserId: f.userId,
                      });
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  Invite {f.handle}
                </Button>
              ))}
          </div>
        ) : null}
        <form onSubmit={invite} className="mt-3 flex flex-wrap gap-2">
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username if they are not a friend yet"
            aria-label="Invite username"
            className="w-40"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending || !handle.trim() || accepted.length >= 5}
          >
            {pending ? "Inviting…" : "Invite"}
          </Button>
        </form>
      </section>

      <section className="space-y-2">
        <MicroLabel>Jobs</MicroLabel>
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-sm text-muted">
            Drop a job from an application with “Drop in a pod”. Everyone’s
            status shows here.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => {
              const row = savesByJob.get(job.id) ?? [];
              return (
                <li key={job.id}>
                  <Link
                    href={`/pods/${pod.id}/${job.id}`}
                    className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-background"
                  >
                    <p className="text-sm font-medium text-text">{job.company}</p>
                    <p className="mt-0.5 text-sm text-muted">{job.role}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {accepted.map((m) => {
                        const save = row.find((s) => s.userId === m.userId);
                        return save ? (
                          <StatusPill
                            key={m.id}
                            status={`${m.handle ? `@${m.handle}` : "you"} · ${save.status}`}
                            color={STATUS_COLORS[save.status]}
                          />
                        ) : (
                          <span
                            key={m.id}
                            className="font-mono text-[11px] text-muted"
                          >
                            {m.handle ? `@${m.handle}` : "member"} · —
                          </span>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${pod.name}?`}
        description="The shared list and job chats go with it. Everyone’s own board stays."
        busy={pending}
        onCancel={() => {
          if (!pending) setConfirmDelete(false);
        }}
        onConfirm={removePod}
      />
    </div>
  );
}
