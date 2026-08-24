import { notFound } from "next/navigation";
import { PodDetail } from "@/components/pod-detail";
import { listFriendships } from "@/lib/data/friends";
import {
  listPodJobSaves,
  listPodJobs,
  listPodMembers,
  getPod,
} from "@/lib/data/pods";
import { otherPartyHandle, otherPartyId } from "@/lib/friends";
import { getUser } from "@/lib/supabase/server";

export default async function PodPage({
  params,
}: {
  params: Promise<{ podId: string }>;
}) {
  const user = await getUser();
  if (!user) return null;
  const { podId } = await params;
  const pod = await getPod(podId);
  if (!pod) notFound();

  const [members, friendships] = await Promise.all([
    listPodMembers(podId),
    listFriendships().catch(() => []),
  ]);
  if (!members.some((m) => m.userId === user.id)) notFound();

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({
      userId: otherPartyId(user.id, f),
      handle: otherPartyHandle(user.id, f) ?? "Friend",
    }));

  const jobs = await listPodJobs(podId);
  const saves = (
    await Promise.all(jobs.map((j) => listPodJobSaves(j.id)))
  ).flat();

  return (
    <div className="mx-auto max-w-[720px]">
      <PodDetail
        userId={user.id}
        pod={pod}
        members={members}
        jobs={jobs}
        saves={saves}
        friends={friends}
      />
    </div>
  );
}
