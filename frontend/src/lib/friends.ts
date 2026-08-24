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

function normJobText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normJobUrl(url?: string | null) {
  if (!url?.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function sameSharedJob(
  a: { company: string; role: string; jobUrl?: string | null },
  b: { company: string; role: string; jobUrl?: string | null }
) {
  const aUrl = normJobUrl(a.jobUrl);
  const bUrl = normJobUrl(b.jobUrl);
  if (aUrl && bUrl) return aUrl === bUrl;
  return (
    normJobText(a.company) === normJobText(b.company) &&
    normJobText(a.role) === normJobText(b.role)
  );
}

export type ApplicationShare = {
  threadId: string;
  friendUserId: string;
  handle: string;
  direction: "sent" | "received";
};

export function sharesForApplication(
  userId: string,
  application: {
    id: string;
    company: string;
    role: string;
    jobUrl?: string | null;
  },
  threads: JobThread[],
  friendships: Friendship[]
): ApplicationShare[] {
  const byFriend = new Map<string, ApplicationShare>();
  for (const thread of threads) {
    if (
      thread.applicationId !== application.id &&
      !sameSharedJob(thread, application)
    ) {
      continue;
    }
    const friendUserId = threadPeerId(userId, thread);
    const next: ApplicationShare = {
      threadId: thread.id,
      friendUserId,
      handle: threadPeerHandle(userId, thread, friendships) ?? "Friend",
      direction: thread.ownerId === userId ? "sent" : "received",
    };
    const prev = byFriend.get(friendUserId);
    if (!prev || (next.direction === "received" && prev.direction === "sent")) {
      byFriend.set(friendUserId, next);
    }
  }
  return [...byFriend.values()];
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
