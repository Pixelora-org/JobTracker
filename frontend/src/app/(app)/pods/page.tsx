import Link from "next/link";
import { PodsHome } from "@/components/pods-home";
import { EmptyState } from "@/components/ui";
import { listFriendships } from "@/lib/data/friends";
import {
  listMyPendingPodInvites,
  listPodMembers,
  listPods,
} from "@/lib/data/pods";
import { otherPartyHandle, otherPartyId } from "@/lib/friends";
import { getUser } from "@/lib/supabase/server";
import { friendlyDataError } from "@/lib/supabase/errors";
import type { PodMember } from "@/lib/types";

export default async function PodsPage() {
  const user = await getUser();
  if (!user) return null;

  let loadError: string | null = null;
  let pods = await listPods().catch((e) => {
    loadError = e instanceof Error ? e.message : "Could not load pods.";
    return [];
  });
  let pending: PodMember[] = [];
  let friends: { userId: string; handle: string }[] = [];
  const membersByPod: Record<string, PodMember[]> = {};

  if (!loadError) {
    try {
      const [invites, friendships] = await Promise.all([
        listMyPendingPodInvites(user.id),
        listFriendships().catch(() => []),
      ]);
      pending = invites;
      friends = friendships
        .filter((f) => f.status === "accepted")
        .map((f) => ({
          userId: otherPartyId(user.id, f),
          handle: otherPartyHandle(user.id, f) ?? "Friend",
        }));
      await Promise.all(
        pods.map(async (pod) => {
          membersByPod[pod.id] = await listPodMembers(pod.id);
        })
      );
    } catch (e) {
      loadError =
        e instanceof Error
          ? e.message
          : "Could not load pods. Re-run supabase/schema.sql so the pod tables exist.";
      pods = [];
    }
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Together
        </p>
        <h1 className="text-xl font-medium tracking-tight">Pods</h1>
        <p className="mt-1 text-sm text-muted">
          Shared list. Your board stays yours. Status is the point; chat lives
          on each job. 1:1 send is on{" "}
          <Link href="/friends" className="text-accent hover:underline">
            Friends
          </Link>
          .
        </p>
      </div>

      {loadError ? (
        <EmptyState
          title="Couldn’t load pods"
          description={friendlyDataError(loadError)}
        />
      ) : (
        <PodsHome
          userId={user.id}
          pods={pods}
          membersByPod={membersByPod}
          pending={pending}
          friends={friends}
        />
      )}
    </div>
  );
}
