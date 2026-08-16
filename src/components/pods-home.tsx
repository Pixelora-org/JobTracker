"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPodAction, deletePodAction } from "@/lib/actions/pods";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Pod, PodMember } from "@/lib/types";
import { Button, ErrorBanner, Input } from "@/components/ui";

export function PodsHome({
  userId,
  pods,
  membersByPod,
  pending,
  friends,
}: {
  userId: string;
  pods: Pod[];
  membersByPod: Record<string, PodMember[]>;
  pending: PodMember[];
  friends: { userId: string; handle: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pod | null>(null);
  const [pendingCreate, startCreate] = useTransition();
  const [pendingRemove, startRemove] = useTransition();

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 4
          ? prev
          : [...prev, id]
    );
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startCreate(async () => {
      const result = await createPodAction(name, picked);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setPicked([]);
      router.push(`/pods/${result.data.id}`);
    });
  }

  function removePod() {
    if (!pendingDelete) return;
    setError(null);
    startRemove(async () => {
      const result = await deletePodAction(pendingDelete.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingDelete(null);
      router.refresh();
    });
  }

  const accepted = pods.filter((p) =>
    (membersByPod[p.id] ?? []).some(
      (m) => m.userId === userId && m.status === "accepted"
    )
  );

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} /> : null}

      <form onSubmit={create} className="space-y-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Intern hunt"
            aria-label="Pod name"
            className="w-48"
          />
          <Button type="submit" disabled={pendingCreate || name.trim().length < 2}>
            {pendingCreate ? "Creating…" : "New pod"}
          </Button>
        </div>
        {friends.length > 0 ? (
          <div>
            <p className="text-xs text-muted">Invite friends now (optional, max 4)</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {friends.map((f) => {
                const on = picked.includes(f.userId);
                return (
                  <li key={f.userId}>
                    <label
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${
                        on
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-text"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => toggle(f.userId)}
                      />
                      {f.handle}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Add friends first if you want to invite them in this step.
          </p>
        )}
      </form>

      {pending.length > 0 ? (
        <p className="text-sm text-muted">
          {pending.length} invite{pending.length === 1 ? "" : "s"} waiting in
          the bell.
        </p>
      ) : null}

      {accepted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8">
          <p className="text-sm text-text">No pods yet.</p>
          <p className="mt-1 text-sm text-muted">
            Shared list. Your board stays yours. Status is the point; chat
            lives on each job.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {accepted.map((pod) => {
            const members = (membersByPod[pod.id] ?? []).filter(
              (m) => m.status === "accepted"
            );
            return (
              <li
                key={pod.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <Link href={`/pods/${pod.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <span className="block text-sm font-medium text-text">
                    {pod.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted">
                    {members
                      .map((m) => (m.handle ? `@${m.handle}` : "member"))
                      .join(" · ")}
                  </span>
                </Link>
                {pod.createdBy === userId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingRemove}
                    onClick={() => setPendingDelete(pod)}
                  >
                    Delete
                  </Button>
                ) : (
                  <Link
                    href={`/pods/${pod.id}`}
                    className="shrink-0 font-mono text-[11px] text-accent hover:underline"
                  >
                    Open ↗
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete pod?"}
        description="The shared list and job chats go with it. Everyone’s own board stays."
        busy={pendingRemove}
        onCancel={() => {
          if (!pendingRemove) setPendingDelete(null);
        }}
        onConfirm={removePod}
      />
    </div>
  );
}
