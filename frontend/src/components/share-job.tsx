"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shareJobAction } from "@/lib/actions/friends";
import { dropJobInPodAction } from "@/lib/actions/pods";
import type { ApplicationShare } from "@/lib/friends";
import { Button, MicroLabel, Select } from "@/components/ui";

export function ShareJob({
  applicationId,
  friends,
  pods = [],
  contactCount = 0,
  shares = [],
}: {
  applicationId: string;
  friends: { userId: string; handle: string }[];
  pods?: { id: string; name: string }[];
  contactCount?: number;
  shares?: ApplicationShare[];
}) {
  const router = useRouter();
  const availableFriends = friends.filter(
    (f) => !shares.some((s) => s.friendUserId === f.userId)
  );
  const [target, setTarget] = useState(
    availableFriends[0]
      ? `friend:${availableFriends[0].userId}`
      : pods[0]
        ? `pod:${pods[0].id}`
        : ""
  );
  const [includeContacts, setIncludeContacts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSend = availableFriends.length > 0 || pods.length > 0;
  if (shares.length === 0 && !canSend) return null;

  function onShare() {
    setError(null);
    startTransition(async () => {
      if (target.startsWith("pod:")) {
        const result = await dropJobInPodAction({
          podId: target.slice(4),
          applicationId,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/pods/${target.slice(4)}/${result.data.jobId}`);
        return;
      }
      const result = await shareJobAction({
        applicationId,
        friendUserId: target.slice(7),
        includeContacts,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/friends/${result.data.threadId}`);
    });
  }

  const sharingWithFriend = target.startsWith("friend:");
  const sent = shares.filter((s) => s.direction === "sent");
  const received = shares.filter((s) => s.direction === "received");

  return (
    <section className="rounded-lg border border-border bg-surface px-4 py-3">
      <MicroLabel>Together</MicroLabel>
      {shares.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {received.map((item) => (
            <li key={item.threadId}>
              <Link
                href={`/friends/${item.threadId}`}
                className="text-sm text-text hover:text-accent"
              >
                Shared with you by {item.handle}
                <span className="ml-2 font-mono text-[11px] text-accent">Open ↗</span>
              </Link>
            </li>
          ))}
          {sent.map((item) => (
            <li key={item.threadId}>
              <Link
                href={`/friends/${item.threadId}`}
                className="text-sm text-text hover:text-accent"
              >
                You shared this with {item.handle}
                <span className="ml-2 font-mono text-[11px] text-accent">Open ↗</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {canSend ? (
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-end ${shares.length > 0 ? "mt-3" : "mt-2"}`}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Share with</span>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Share with"
            >
              {availableFriends.length > 0 ? (
                <optgroup label="Send to a friend (1:1)">
                  {availableFriends.map((f) => (
                    <option key={f.userId} value={`friend:${f.userId}`}>
                      {f.handle}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {pods.length > 0 ? (
                <optgroup label="Drop in a pod (everyone sees status)">
                  {pods.map((p) => (
                    <option key={p.id} value={`pod:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
          </label>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 whitespace-nowrap"
            disabled={pending || !target}
            onClick={onShare}
          >
            {pending
              ? "Sharing…"
              : target.startsWith("pod:")
                ? "Drop in pod"
                : "Send to friend"}
          </Button>
        </div>
      ) : null}

      {canSend && sharingWithFriend && contactCount > 0 ? (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={includeContacts}
            onChange={(e) => setIncludeContacts(e.target.checked)}
            className="rounded border-border"
          />
          Include {contactCount} {contactCount === 1 ? "person" : "people"} I
          already reached
        </label>
      ) : null}
      {error ? <p className="mt-2 text-xs text-[#9B2C3D]">{error}</p> : null}
    </section>
  );
}
