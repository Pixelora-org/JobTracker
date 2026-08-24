import { createClient } from "@/lib/supabase/server";
import type {
  Pod,
  PodJob,
  PodJobSave,
  PodMember,
  PodMessage,
  Status,
} from "@/lib/types";

type PodRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MemberRow = {
  id: string;
  pod_id: string;
  user_id: string;
  handle: string | null;
  status: "pending" | "accepted";
  invited_by: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  pod_id: string;
  added_by: string;
  company: string;
  role: string;
  job_url: string | null;
  created_at: string;
};

type SaveRow = {
  id: string;
  pod_job_id: string;
  user_id: string;
  application_id: string | null;
  status: Status;
  updated_at: string;
};

type MessageRow = {
  id: string;
  pod_job_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const POD_COLUMNS = "id, name, created_by, created_at";
const MEMBER_COLUMNS =
  "id, pod_id, user_id, handle, status, invited_by, created_at";
const JOB_COLUMNS =
  "id, pod_id, added_by, company, role, job_url, created_at";
const SAVE_COLUMNS =
  "id, pod_job_id, user_id, application_id, status, updated_at";
const MESSAGE_COLUMNS = "id, pod_job_id, user_id, body, created_at";

function toPod(row: PodRow): Pod {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toMember(row: MemberRow): PodMember {
  return {
    id: row.id,
    podId: row.pod_id,
    userId: row.user_id,
    handle: row.handle,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
}

function toJob(row: JobRow): PodJob {
  return {
    id: row.id,
    podId: row.pod_id,
    addedBy: row.added_by,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    createdAt: row.created_at,
  };
}

function toSave(row: SaveRow): PodJobSave {
  return {
    id: row.id,
    podJobId: row.pod_job_id,
    userId: row.user_id,
    applicationId: row.application_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): PodMessage {
  return {
    id: row.id,
    podJobId: row.pod_job_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listPods() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pods")
    .select(POD_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PodRow[]).map(toPod);
}

export async function getPod(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pods")
    .select(POD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPod(data as PodRow) : null;
}

export async function createPod(name: string, userId: string, handle: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pods")
    .insert({ name, created_by: userId })
    .select(POD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const pod = toPod(data as PodRow);
  const { error: memberError } = await supabase.from("pod_members").insert({
    pod_id: pod.id,
    user_id: userId,
    handle,
    status: "accepted",
    invited_by: userId,
  });
  if (memberError) throw new Error(memberError.message);
  return pod;
}

export async function countPendingPodInvites(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("pod_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listPodMembers(podId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_members")
    .select(MEMBER_COLUMNS)
    .eq("pod_id", podId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MemberRow[]).map(toMember);
}

export async function listMyPendingPodInvites(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_members")
    .select(MEMBER_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as MemberRow[]).map(toMember);
}

export async function getPodMember(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_members")
    .select(MEMBER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toMember(data as MemberRow) : null;
}

export async function invitePodMember(input: {
  podId: string;
  userId: string;
  handle: string | null;
  invitedBy: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_members")
    .insert({
      pod_id: input.podId,
      user_id: input.userId,
      handle: input.handle,
      status: "pending",
      invited_by: input.invitedBy,
    })
    .select(MEMBER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toMember(data as MemberRow);
}

export async function acceptPodMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pod_members")
    .update({ status: "accepted" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePodMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pod_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePod(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pods").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPodJobs(podId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_jobs")
    .select(JOB_COLUMNS)
    .eq("pod_id", podId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as JobRow[]).map(toJob);
}

export async function getPodJob(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_jobs")
    .select(JOB_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toJob(data as JobRow) : null;
}

export async function createPodJob(input: {
  podId: string;
  addedBy: string;
  company: string;
  role: string;
  jobUrl?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_jobs")
    .insert({
      pod_id: input.podId,
      added_by: input.addedBy,
      company: input.company,
      role: input.role,
      job_url: input.jobUrl ?? null,
    })
    .select(JOB_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toJob(data as JobRow);
}

export async function listPodJobSaves(podJobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_job_saves")
    .select(SAVE_COLUMNS)
    .eq("pod_job_id", podJobId);
  if (error) throw new Error(error.message);
  return (data as SaveRow[]).map(toSave);
}

export async function listPodSavesForJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_job_saves")
    .select(SAVE_COLUMNS)
    .in("pod_job_id", jobIds);
  if (error) throw new Error(error.message);
  return (data as SaveRow[]).map(toSave);
}

export async function upsertPodJobSave(input: {
  podJobId: string;
  userId: string;
  applicationId: string | null;
  status: Status;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_job_saves")
    .upsert(
      {
        pod_job_id: input.podJobId,
        user_id: input.userId,
        application_id: input.applicationId,
        status: input.status,
      },
      { onConflict: "pod_job_id,user_id" }
    )
    .select(SAVE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toSave(data as SaveRow);
}

export async function updatePodJobSaveStatus(
  podJobId: string,
  userId: string,
  status: Status
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_job_saves")
    .update({ status })
    .eq("pod_job_id", podJobId)
    .eq("user_id", userId)
    .select(SAVE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return toSave(data as SaveRow);
  return upsertPodJobSave({
    podJobId,
    userId,
    applicationId: null,
    status,
  });
}

export async function syncPodSavesForApplication(
  applicationId: string,
  status: Status
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pod_job_saves")
    .update({ status })
    .eq("application_id", applicationId);
  if (error) throw new Error(error.message);
}

export async function listPodMessages(podJobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_messages")
    .select(MESSAGE_COLUMNS)
    .eq("pod_job_id", podJobId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(toMessage);
}

export async function createPodMessage(
  podJobId: string,
  userId: string,
  body: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pod_messages")
    .insert({ pod_job_id: podJobId, user_id: userId, body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toMessage(data as MessageRow);
}
