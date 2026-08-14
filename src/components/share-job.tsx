"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shareJobAction } from "@/lib/actions/friends";
import { Button, Select } from "@/components/ui";

export function ShareJob({
  applicationId,
  friends,
}: {
  applicationId: string;
  friends: { userId: string; handle: string }[];
}) {
  const router = useRouter();
  const [friendUserId, setFriendUserId] = useState(friends[0]?.userId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (friends.length === 0) {
    return (
      <Link
        href="/friends"
        className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-sm text-text hover:bg-background"
      >
        Add friends
      </Link>
    );
  }

  function share() {
    setError(null);
    startTransition(async () => {
      const result = await shareJobAction({ applicationId, friendUserId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/friends/${result.data.threadId}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Select
          value={friendUserId}
          onChange={(e) => setFriendUserId(e.target.value)}
          aria-label="Share with friend"
          className="w-[180px]"
        >
          {friends.map((f) => (
            <option key={f.userId} value={f.userId}>
              {f.handle}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !friendUserId}
          onClick={share}
        >
          {pending ? "Sharing…" : "Share with"}
        </Button>
      </div>
      {error ? <p className="text-xs text-[#9B2C3D]">{error}</p> : null}
    </div>
  );
}
