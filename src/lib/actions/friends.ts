"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createApplication, getApplication } from "@/lib/data/applications";
import {
  createFriendship,
  createMessage,
  createThread,
  deleteFriendship,
  findFriendshipBetween,
  getFriendship,
  getThread,
  listThreads,
  updateFriendshipStatus,
} from "@/lib/data/friends";
import { getUser } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/actions/result";

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function revalidateThread(threadId?: string, applicationId?: string | null) {
  revalidatePath("/friends");
  if (threadId) revalidatePath(`/friends/${threadId}`);
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function inviteFriendAction(
  handle: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!user.username) {
      return { ok: false, error: "Pick a username before adding friends." };
    }

    const raw = handle.trim().replace(/^@/, "");
    const clerk = await clerkClient();
    let peerId = "";
    let peerUsername: string | null = null;
    let peerEmail: string | null = null;

    if (raw.includes("@")) {
      const email = raw.toLowerCase();
      if (user.email && email === user.email.toLowerCase()) {
        return { ok: false, error: "That is your own email." };
      }
      const found = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });
      const peer = found.data[0];
      if (!peer) {
        return {
          ok: false,
          error: "No account with that email. Ask them for their username.",
        };
      }
      peerId = peer.id;
      peerUsername = peer.username;
      peerEmail = peer.primaryEmailAddress?.emailAddress ?? email;
    } else {
      const username = raw.toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return { ok: false, error: "Enter a username like myname." };
      }
      if (username === user.username.toLowerCase()) {
        return { ok: false, error: "That is your own username." };
      }
      const found = await clerk.users.getUserList({
        username: [username],
        limit: 1,
      });
      const peer = found.data[0];
      if (!peer) {
        return {
          ok: false,
          error: "No account with that username yet.",
        };
      }
      peerId = peer.id;
      peerUsername = peer.username ?? username;
      peerEmail = peer.primaryEmailAddress?.emailAddress ?? null;
    }

    const existing = await findFriendshipBetween(user.id, peerId);
    if (existing) {
      return {
        ok: false,
        error:
          existing.status === "accepted"
            ? "You are already friends."
            : "An invite is already pending.",
      };
    }

    await createFriendship({
      requesterId: user.id,
      addresseeId: peerId,
      requesterEmail: user.email,
      addresseeEmail: peerEmail,
      requesterUsername: user.username,
      addresseeUsername: peerUsername,
    });
    revalidatePath("/friends");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send invite") };
  }
}

export async function acceptFriendAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const friendship = await getFriendship(id);
    if (!friendship) return { ok: false, error: "Invite not found." };
    if (friendship.addresseeId !== user.id) {
      return { ok: false, error: "Only the person you invited can accept." };
    }
    await updateFriendshipStatus(id, "accepted");
    revalidatePath("/friends");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not accept invite") };
  }
}

export async function ignoreFriendAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const friendship = await getFriendship(id);
    if (!friendship) return { ok: false, error: "Invite not found." };
    if (
      friendship.requesterId !== user.id &&
      friendship.addresseeId !== user.id
    ) {
      return { ok: false, error: "Invite not found." };
    }
    await deleteFriendship(id);
    revalidatePath("/friends");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not update invite") };
  }
}

export async function shareJobAction(input: {
  applicationId: string;
  friendUserId: string;
}): Promise<ActionResult<{ threadId: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    const friendship = await findFriendshipBetween(user.id, input.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      return { ok: false, error: "Share only with accepted friends." };
    }

    const app = await getApplication(input.applicationId);
    if (!app) return { ok: false, error: "Application not found." };

    const existing = (await listThreads()).find(
      (t) =>
        t.applicationId === app.id &&
        t.ownerId === user.id &&
        t.peerId === input.friendUserId
    );
    if (existing) {
      return { ok: true, data: { threadId: existing.id } };
    }

    const thread = await createThread({
      applicationId: app.id,
      ownerId: user.id,
      peerId: input.friendUserId,
      company: app.company,
      role: app.role,
      jobUrl: app.jobUrl,
    });
    revalidateThread(thread.id, app.id);
    return { ok: true, data: { threadId: thread.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not share this job") };
  }
}

export async function sendMessageAction(input: {
  threadId: string;
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const text = input.body.trim();
    if (!text) return { ok: false, error: "Type a message first." };

    const thread = await getThread(input.threadId);
    if (!thread) return { ok: false, error: "Thread not found." };
    if (thread.ownerId !== user.id && thread.peerId !== user.id) {
      return { ok: false, error: "Thread not found." };
    }

    const msg = await createMessage(input.threadId, user.id, text);
    revalidatePath(`/friends/${input.threadId}`);
    return { ok: true, data: { id: msg.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send") };
  }
}

export async function saveSharedJobAction(
  threadId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const thread = await getThread(threadId);
    if (!thread) return { ok: false, error: "Thread not found." };
    if (thread.peerId !== user.id) {
      return { ok: false, error: "This job is already on your board." };
    }

    const app = await createApplication(
      {
        company: thread.company,
        role: thread.role,
        jobUrl: thread.jobUrl ?? undefined,
        track: "Other",
        status: "Wishlist",
        source: "Referral",
        notes: "Saved from a friend share.",
      },
      user.id
    );
    revalidatePath("/board");
    revalidatePath("/applications");
    revalidatePath("/friends");
    revalidatePath(`/friends/${threadId}`);
    return { ok: true, data: { id: app.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not save to your board") };
  }
}
