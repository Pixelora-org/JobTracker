import { createClient } from "@/lib/supabase/server";
import type { Friendship, JobMessage, JobThread } from "@/lib/types";

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_email: string | null;
  addressee_email: string | null;
  requester_username: string | null;
  addressee_username: string | null;
  status: "pending" | "accepted";
  created_at: string;
};

const FRIENDSHIP_COLUMNS =
  "id, requester_id, addressee_id, requester_email, addressee_email, requester_username, addressee_username, status, created_at";

type ThreadRow = {
  id: string;
  application_id: string | null;
  owner_id: string;
  peer_id: string;
  company: string;
  role: string;
  job_url: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

function toFriendship(row: FriendshipRow): Friendship {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    requesterEmail: row.requester_email,
    addresseeEmail: row.addressee_email,
    requesterUsername: row.requester_username,
    addresseeUsername: row.addressee_username,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toThread(row: ThreadRow): JobThread {
  return {
    id: row.id,
    applicationId: row.application_id,
    ownerId: row.owner_id,
    peerId: row.peer_id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    createdAt: row.created_at,
  };
}

function toMessage(row: MessageRow): JobMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function countIncomingInvites(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listFriendships() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as FriendshipRow[]).map(toFriendship);
}

export async function getFriendship(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toFriendship(data as FriendshipRow) : null;
}

export async function findFriendshipBetween(a: string, b: string) {
  const all = await listFriendships();
  return (
    all.find(
      (f) =>
        (f.requesterId === a && f.addresseeId === b) ||
        (f.requesterId === b && f.addresseeId === a)
    ) ?? null
  );
}

export async function createFriendship(input: {
  requesterId: string;
  addresseeId: string;
  requesterEmail: string | null;
  addresseeEmail: string | null;
  requesterUsername: string | null;
  addresseeUsername: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: input.requesterId,
      addressee_id: input.addresseeId,
      requester_email: input.requesterEmail,
      addressee_email: input.addresseeEmail,
      requester_username: input.requesterUsername,
      addressee_username: input.addresseeUsername,
      status: "pending",
    })
    .select(FRIENDSHIP_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toFriendship(data as FriendshipRow);
}

export async function updateFriendshipStatus(
  id: string,
  status: "pending" | "accepted"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFriendship(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listThreads() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_threads")
    .select(
      "id, application_id, owner_id, peer_id, company, role, job_url, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ThreadRow[]).map(toThread);
}

export async function getThread(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_threads")
    .select(
      "id, application_id, owner_id, peer_id, company, role, job_url, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toThread(data as ThreadRow) : null;
}

export async function createThread(input: {
  applicationId: string;
  ownerId: string;
  peerId: string;
  company: string;
  role: string;
  jobUrl?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_threads")
    .insert({
      application_id: input.applicationId,
      owner_id: input.ownerId,
      peer_id: input.peerId,
      company: input.company,
      role: input.role,
      job_url: input.jobUrl ?? null,
    })
    .select(
      "id, application_id, owner_id, peer_id, company, role, job_url, created_at"
    )
    .single();
  if (error) throw new Error(error.message);
  return toThread(data as ThreadRow);
}

export async function listMessages(threadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_messages")
    .select("id, thread_id, user_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(toMessage);
}

export async function createMessage(
  threadId: string,
  userId: string,
  body: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_messages")
    .insert({ thread_id: threadId, user_id: userId, body })
    .select("id, thread_id, user_id, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  return toMessage(data as MessageRow);
}
