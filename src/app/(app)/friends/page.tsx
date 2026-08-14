import { FriendsPanel } from "@/components/friends-panel";
import { EmptyState } from "@/components/ui";
import { listFriendships, listThreads } from "@/lib/data/friends";
import { getUser } from "@/lib/supabase/server";
import type { Friendship, JobThread } from "@/lib/types";

export default async function FriendsPage() {
  const user = await getUser();
  if (!user) return null;

  let friendships: Friendship[] = [];
  let threads: JobThread[] = [];
  let loadError: string | null = null;

  try {
    [friendships, threads] = await Promise.all([
      listFriendships(),
      listThreads(),
    ]);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Could not load friends. Re-run supabase/schema.sql so the chat tables exist.";
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Together
        </p>
        <h1 className="text-xl font-medium tracking-tight">Friends</h1>
        <p className="mt-1 text-sm text-muted">
          Invite by username, then share a job from its application page to
          open a thread.
        </p>
      </div>

      {loadError ? (
        <EmptyState title="Couldn’t load friends" description={loadError} />
      ) : (
        <FriendsPanel
          userId={user.id}
          friendships={friendships}
          threads={threads}
        />
      )}
    </div>
  );
}
