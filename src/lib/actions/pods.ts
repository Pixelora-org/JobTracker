"use server";

import { revalidatePath } from "next/cache";
import { resolveClerkPeer } from "@/lib/clerk-peer";
import { findFriendshipBetween } from "@/lib/data/friends";
import { createApplication, getApplication } from "@/lib/data/applications";
import { createNotification } from "@/lib/data/notifications";
import {
  acceptPodMember,
  createPod,
  createPodJob,
  createPodMessage,
  deletePod,
  deletePodMember,
  getPod,
  getPodJob,
  getPodMember,
  invitePodMember,
  listPodMembers,
  upsertPodJobSave,
  updatePodJobSaveStatus,
} from "@/lib/data/pods";
import { getUser } from "@/lib/supabase/server";
import { otherPartyHandle } from "@/lib/friends";
import type { Status } from "@/lib/types";

import type { ActionResult } from "@/lib/actions/result";

const POD_MEMBER_CAP = 5;

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function revalidatePods(podId?: string, jobId?: string) {
  revalidatePath("/pods");
  revalidatePath("/friends");
  revalidatePath("/", "layout");
  if (podId) revalidatePath(`/pods/${podId}`);
  if (podId && jobId) revalidatePath(`/pods/${podId}/${jobId}`);
}

async function inviteAcceptedFriendToPod(
  podId: string,
  user: { id: string; username: string | null; email: string | null },
  friendUserId: string
) {
  const friendship = await findFriendshipBetween(user.id, friendUserId);
  if (!friendship || friendship.status !== "accepted") {
    return { ok: false as const, error: "Invite friends you already added, or use a username." };
  }
  const members = await listPodMembers(podId);
  if (!members.some((m) => m.userId === user.id && m.status === "accepted")) {
    return { ok: false as const, error: "You are not in this pod." };
  }
  if (members.length >= POD_MEMBER_CAP) {
    return { ok: false as const, error: "Pods cap at 5 people." };
  }
  if (members.some((m) => m.userId === friendUserId)) {
    return { ok: false as const, error: "They are already in this pod." };
  }
  const handle = otherPartyHandle(user.id, friendship)?.replace(/^@/, "") ?? null;
  await invitePodMember({
    podId,
    userId: friendUserId,
    handle,
    invitedBy: user.id,
  });
  return { ok: true as const };
}

export async function createPodAction(
  name: string,
  friendUserIds: string[] = []
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { ok: false, error: "Give the pod a short name." };
    }
    const pod = await createPod(trimmed.slice(0, 40), user.id, user.username);
    const unique = [...new Set(friendUserIds)].slice(0, POD_MEMBER_CAP - 1);
    for (const friendUserId of unique) {
      const invited = await inviteAcceptedFriendToPod(pod.id, user, friendUserId);
      if (!invited.ok && invited.error === "Pods cap at 5 people.") break;
    }
    revalidatePods(pod.id);
    return { ok: true, data: { id: pod.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not create pod") };
  }
}

export async function inviteToPodAction(input: {
  podId: string;
  handle?: string;
  friendUserId?: string;
}): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    if (input.friendUserId) {
      const invited = await inviteAcceptedFriendToPod(
        input.podId,
        user,
        input.friendUserId
      );
      if (!invited.ok) return invited;
      revalidatePods(input.podId);
      return { ok: true, data: undefined };
    }

    const handle = input.handle?.trim() ?? "";
    if (!handle) return { ok: false, error: "Enter a username or pick a friend." };

    const members = await listPodMembers(input.podId);
    const me = members.find((m) => m.userId === user.id && m.status === "accepted");
    if (!me) return { ok: false, error: "You are not in this pod." };
    if (members.length >= POD_MEMBER_CAP) {
      return { ok: false, error: "Pods cap at 5 people." };
    }

    const peer = await resolveClerkPeer(handle, user);
    if (!peer.ok) return peer;
    if (members.some((m) => m.userId === peer.id)) {
      return { ok: false, error: "They are already in this pod." };
    }

    await invitePodMember({
      podId: input.podId,
      userId: peer.id,
      handle: peer.username,
      invitedBy: user.id,
    });
    revalidatePods(input.podId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send invite") };
  }
}

export async function acceptPodInviteAction(
  memberId: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const row = await getPodMember(memberId);
    if (!row || row.userId !== user.id) {
      return { ok: false, error: "Invite not found." };
    }
    const members = await listPodMembers(row.podId);
    if (members.filter((m) => m.status === "accepted").length >= POD_MEMBER_CAP) {
      return { ok: false, error: "This pod is full." };
    }
    await acceptPodMember(memberId);
    revalidatePods(row.podId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not join") };
  }
}

export async function ignorePodInviteAction(
  memberId: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const row = await getPodMember(memberId);
    if (!row || row.userId !== user.id) {
      return { ok: false, error: "Invite not found." };
    }
    await deletePodMember(memberId);
    revalidatePods(row.podId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not update invite") };
  }
}

export async function leavePodAction(memberId: string): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const row = await getPodMember(memberId);
    if (!row || row.userId !== user.id) {
      return { ok: false, error: "Membership not found." };
    }
    const pod = await getPod(row.podId);
    if (pod?.createdBy === user.id) {
      return {
        ok: false,
        error: "You created this pod. Delete it instead of leaving.",
      };
    }
    await deletePodMember(memberId);
    revalidatePods(row.podId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not leave") };
  }
}

export async function deletePodAction(podId: string): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const pod = await getPod(podId);
    if (!pod) return { ok: false, error: "Pod not found." };
    if (pod.createdBy !== user.id) {
      return { ok: false, error: "Only the person who created this pod can delete it." };
    }
    await deletePod(podId);
    revalidatePods(podId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not delete pod") };
  }
}

export async function dropJobInPodAction(input: {
  podId: string;
  applicationId: string;
}): Promise<ActionResult<{ jobId: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    const members = await listPodMembers(input.podId);
    if (!members.some((m) => m.userId === user.id && m.status === "accepted")) {
      return { ok: false, error: "You are not in this pod." };
    }

    const app = await getApplication(input.applicationId);
    if (!app) return { ok: false, error: "Application not found." };

    const job = await createPodJob({
      podId: input.podId,
      addedBy: user.id,
      company: app.company,
      role: app.role,
      jobUrl: app.jobUrl,
    });
    await upsertPodJobSave({
      podJobId: job.id,
      userId: user.id,
      applicationId: app.id,
      status: app.status,
    });

    const others = members.filter(
      (m) => m.status === "accepted" && m.userId !== user.id
    );
    const handle = user.username ? `@${user.username}` : "A teammate";
    await Promise.all(
      others.map((m) =>
        createNotification({
          userId: m.userId,
          actorId: user.id,
          actorHandle: user.username,
          type: "pod_job",
          title: `${handle} dropped ${app.company} in the pod`,
          body: app.role,
          href: `/pods/${input.podId}/${job.id}`,
        }).catch(() => undefined)
      )
    );

    revalidatePods(input.podId, job.id);
    revalidatePath(`/applications/${app.id}`);
    return { ok: true, data: { jobId: job.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not add this job") };
  }
}

export async function savePodJobAction(
  podJobId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const job = await getPodJob(podJobId);
    if (!job) return { ok: false, error: "Job not found." };

    const app = await createApplication(
      {
        company: job.company,
        role: job.role,
        jobUrl: job.jobUrl ?? undefined,
        track: "Other",
        status: "Wishlist",
        source: "Referral",
        notes: "Saved from a pod.",
      },
      user.id
    );
    await upsertPodJobSave({
      podJobId,
      userId: user.id,
      applicationId: app.id,
      status: "Wishlist",
    });
    revalidatePods(job.podId, job.id);
    revalidatePath("/board");
    revalidatePath("/today");
    return { ok: true, data: { id: app.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not save to your board") };
  }
}

export async function sendPodMessageAction(input: {
  podJobId: string;
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const text = input.body.trim();
    if (!text) return { ok: false, error: "Type a message first." };
    const job = await getPodJob(input.podJobId);
    if (!job) return { ok: false, error: "Job not found." };
    const msg = await createPodMessage(input.podJobId, user.id, text);
    revalidatePath(`/pods/${job.podId}/${job.id}`);
    return { ok: true, data: { id: msg.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send") };
  }
}

export async function updatePodSaveStatusAction(input: {
  podJobId: string;
  status: Status;
}): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    const job = await getPodJob(input.podJobId);
    if (!job) return { ok: false, error: "Job not found." };
    await updatePodJobSaveStatus(input.podJobId, user.id, input.status);
    revalidatePods(job.podId, job.id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not update status") };
  }
}

