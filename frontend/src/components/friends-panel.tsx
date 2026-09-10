"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptFriendAction,
  ignoreFriendAction,
  inviteFriendAction,
} from "@/lib/actions/friends";
import { otherPartyHandle, threadPeerHandle } from "@/lib/friends";
import type { Friendship, JobThread } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Button,
  ErrorBanner,
  Field,
  Input,
  MicroLabel,
} from "@/components/ui";

export function FriendsPanel({
  userId,
  friendships,
  threads,
}: {
  userId: string;
  friendships: Friendship[];
  threads: JobThread[];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    who: string;
  } | null>(null);

  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addresseeId === userId
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requesterId === userId
  );
  const accepted = friendships.filter((f) => f.status === "accepted");

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteFriendAction(handle);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHandle("");
      router.refresh();
    });
  }

  function run(
    id: string,
    action: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>
  ) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await action(id);
      setBusyId(null);
      setPendingRemove(null);
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
        onSubmit={invite}
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <MicroLabel>Invite</MicroLabel>
        <p className="text-sm text-muted">
          Send their username. They need a pipeline account first.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Field label="Username">
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@myname"
                autoComplete="off"
                required
              />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending && !busyId ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
      </form>

      {incoming.length > 0 ? (
        <section className="space-y-2">
          <MicroLabel>Incoming</MicroLabel>
          <ul className="space-y-2">
            {incoming.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-text">
                  {otherPartyHandle(userId, f) ?? "Someone"} wants to connect
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === f.id}
                    onClick={() => run(f.id, acceptFriendAction)}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === f.id}
                    onClick={() => run(f.id, ignoreFriendAction)}
                  >
                    Ignore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="space-y-2">
          <MicroLabel>Waiting</MicroLabel>
          <ul className="space-y-2">
            {outgoing.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-muted">
                  Invite sent to {otherPartyHandle(userId, f) ?? "friend"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === f.id}
                  onClick={() => run(f.id, ignoreFriendAction)}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <MicroLabel>Friends</MicroLabel>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted">
            No friends yet. After they accept, send them one job from its
            application page, or invite them into a pod.
          </p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((f) => {
              const who = otherPartyHandle(userId, f) ?? "Friend";
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text"
                >
                  {who}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busyId === f.id}
                    onClick={() => setPendingRemove({ id: f.id, who })}
                  >
                    {busyId === f.id ? "Removing…" : "Remove"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <MicroLabel>1:1 shares</MicroLabel>
        {threads.length === 0 ? (
          <p className="text-sm text-muted">
            Open an application and use Send to a friend. There is no general
            inbox — talk on the job thread.
          </p>
        ) : (
          <ul className="space-y-2">
            {threads.map((thread) => {
              const peer = threadPeerHandle(userId, thread, friendships);
              return (
                <li key={thread.id}>
                  <Link
                    href={`/friends/${thread.id}`}
                    className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-background"
                  >
                    <p className="text-sm font-medium text-text">
                      {thread.company}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {thread.role}
                      {peer ? ` · ${peer}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={
          pendingRemove ? `Remove ${pendingRemove.who}?` : "Remove friend?"
        }
        description="Threads you already share stay put, but neither of you can share new jobs."
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={busyId === pendingRemove?.id}
        onCancel={() => {
          if (!busyId) setPendingRemove(null);
        }}
        onConfirm={() => {
          if (pendingRemove) run(pendingRemove.id, ignoreFriendAction);
        }}
      />
    </div>
  );
}
