"use server";

import { revalidatePath } from "next/cache";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";
import { listFriendships } from "@/lib/data/friends";
import { getPod, listMyPendingPodInvites } from "@/lib/data/pods";
import { otherPartyHandle } from "@/lib/friends";
import { getUser } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/actions/result";

export type BellItem = {
  id: string;
  kind: "friend_invite" | "pod_invite" | "notice";
  title: string;
  detail: string | null;
  href: string;
  createdAt: string;
  friendshipId?: string;
  podMemberId?: string;
  notificationId?: string;
};

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export async function listBellItemsAction(): Promise<
  ActionResult<BellItem[]>
> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    const [friendships, podInvites, notices] = await Promise.all([
      listFriendships().catch(() => []),
      listMyPendingPodInvites(user.id).catch(() => []),
      listNotifications().catch(() => []),
    ]);

    const items: BellItem[] = [];

    for (const f of friendships) {
      if (f.status !== "pending" || f.addresseeId !== user.id) continue;
      const who = otherPartyHandle(user.id, f) ?? "Someone";
      items.push({
        id: `friend-${f.id}`,
        kind: "friend_invite",
        title: `${who} wants to be friends`,
        detail: "Accept to share jobs 1:1.",
        href: "/friends",
        createdAt: f.createdAt,
        friendshipId: f.id,
      });
    }

    for (const m of podInvites) {
      const pod = await getPod(m.podId).catch(() => null);
      items.push({
        id: `pod-${m.id}`,
        kind: "pod_invite",
        title: `Invite to ${pod?.name ?? "a pod"}`,
        detail: "Join to see shared jobs and statuses.",
        href: pod ? `/pods/${pod.id}` : "/pods",
        createdAt: m.createdAt,
        podMemberId: m.id,
      });
    }

    for (const n of notices) {
      if (n.readAt) continue;
      items.push({
        id: `notice-${n.id}`,
        kind: "notice",
        title: n.title,
        detail: n.body,
        href: n.href || "/today",
        createdAt: n.createdAt,
        notificationId: n.id,
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { ok: true, data: items };
  } catch (e) {
    return { ok: false, error: message(e, "Could not load notifications") };
  }
}

export async function markNoticeReadAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    await markNotificationRead(id);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not update") };
  }
}

export async function markAllNoticesReadAction(): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    await markAllNotificationsRead();
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not update") };
  }
}
