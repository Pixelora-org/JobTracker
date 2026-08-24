import { notFound } from "next/navigation";
import { JobThreadChat } from "@/components/job-thread";
import { listFriendships, getThread, listMessages } from "@/lib/data/friends";
import { threadPeerHandle } from "@/lib/friends";
import { getUser } from "@/lib/supabase/server";

export default async function JobThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await getUser();
  if (!user) return null;

  const { threadId } = await params;
  const thread = await getThread(threadId).catch(() => null);
  if (!thread) notFound();
  if (thread.ownerId !== user.id && thread.peerId !== user.id) notFound();

  const [messages, friendships] = await Promise.all([
    listMessages(thread.id),
    listFriendships().catch(() => []),
  ]);

  return (
    <JobThreadChat
      userId={user.id}
      thread={thread}
      messages={messages}
      peerHandle={threadPeerHandle(user.id, thread, friendships)}
    />
  );
}
