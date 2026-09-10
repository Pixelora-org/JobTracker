import { notFound } from "next/navigation";
import { PodJobRoom } from "@/components/pod-job-room";
import {
  getPod,
  getPodJob,
  listPodJobSaves,
  listPodMembers,
  listPodMessages,
} from "@/lib/data/pods";
import { getUser } from "@/lib/supabase/server";

export default async function PodJobPage({
  params,
}: {
  params: Promise<{ podId: string; jobId: string }>;
}) {
  const user = await getUser();
  if (!user) return null;
  const { podId, jobId } = await params;
  const [pod, job] = await Promise.all([getPod(podId), getPodJob(jobId)]);
  if (!pod || !job || job.podId !== podId) notFound();

  const members = await listPodMembers(podId);
  if (!members.some((m) => m.userId === user.id && m.status === "accepted")) {
    notFound();
  }

  const [saves, messages] = await Promise.all([
    listPodJobSaves(job.id),
    listPodMessages(job.id),
  ]);

  return (
    <PodJobRoom
      userId={user.id}
      pod={pod}
      job={job}
      members={members}
      saves={saves}
      messages={messages}
    />
  );
}
