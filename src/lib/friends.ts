import type { Friendship, JobThread } from "@/lib/types";

function formatHandle(username?: string | null, email?: string | null) {
  if (username) return `@${username}`;
  return email ?? null;
}

export function otherPartyId(userId: string, f: Friendship) {
  return userId === f.requesterId ? f.addresseeId : f.requesterId;
}

export function otherPartyHandle(userId: string, f: Friendship) {
  if (userId === f.requesterId) {
    return formatHandle(f.addresseeUsername, f.addresseeEmail);
  }
  return formatHandle(f.requesterUsername, f.requesterEmail);
}

function threadPeerId(userId: string, thread: JobThread) {
  return userId === thread.ownerId ? thread.peerId : thread.ownerId;
}

export function threadPeerHandle(
  userId: string,
  thread: JobThread,
  friendships: Friendship[]
) {
  const peerId = threadPeerId(userId, thread);
  const match = friendships.find((f) => otherPartyId(userId, f) === peerId);
  return match ? otherPartyHandle(userId, match) : null;
}
