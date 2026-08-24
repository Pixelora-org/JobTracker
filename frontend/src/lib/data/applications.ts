import { createClient } from "@/lib/supabase/server";
import type {
  Application,
  ApplicationInput,
  SearchPlan,
  Source,
  Status,
  Track,
  WorkMode,
} from "@/lib/types";
import { emptyToUndefined } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  job_url: string | null;
  track: Track;
  resume_version: string | null;
  status: Status;
  source: Source;
  location: string | null;
  work_mode: WorkMode | null;
  date_applied: string | null;
  next_action_date: string | null;
  notes: string | null;
  search_plan?: SearchPlan | null;
  created_at: string;
  updated_at: string;
};

const APPLICATION_COLUMNS =
  "id, user_id, company, role, job_url, track, resume_version, status, source, location, work_mode, date_applied, next_action_date, notes, created_at, updated_at";

/** The cached search plan is only useful on the detail page, so lists skip it. */
const APPLICATION_DETAIL_COLUMNS = `${APPLICATION_COLUMNS}, search_plan`;

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    track: row.track,
    resumeVersion: row.resume_version,
    status: row.status,
    source: row.source,
    location: row.location,
    workMode: row.work_mode,
    dateApplied: row.date_applied,
    nextActionDate: row.next_action_date,
    notes: row.notes,
    searchPlan: row.search_plan ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<ApplicationInput>) {
  const row: Record<string, unknown> = {};
  if (input.company !== undefined) row.company = input.company.trim();
  if (input.role !== undefined) row.role = input.role.trim();
  if (input.jobUrl !== undefined) row.job_url = emptyToUndefined(input.jobUrl) ?? null;
  if (input.track !== undefined) row.track = input.track;
  if (input.resumeVersion !== undefined)
    row.resume_version = emptyToUndefined(input.resumeVersion) ?? null;
  if (input.status !== undefined) row.status = input.status;
  if (input.source !== undefined) row.source = input.source;
  if (input.location !== undefined)
    row.location = emptyToUndefined(input.location) ?? null;
  if (input.workMode !== undefined)
    row.work_mode = emptyToUndefined(input.workMode) ?? null;
  if (input.dateApplied !== undefined)
    row.date_applied = emptyToUndefined(input.dateApplied) ?? null;
  if (input.nextActionDate !== undefined)
    row.next_action_date = emptyToUndefined(input.nextActionDate) ?? null;
  if (input.notes !== undefined) row.notes = emptyToUndefined(input.notes) ?? null;
  return row;
}

export async function listApplications(opts?: {
  search?: string;
  status?: string;
  track?: string;
  source?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.track) query = query.eq("track", opts.track);
  if (opts?.source) query = query.eq("source", opts.source);
  if (opts?.search?.trim()) {
    const term = `%${opts.search.trim()}%`;
    query = query.or(`company.ilike.${term},role.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data as ApplicationRow[]).map(toApplication);
}

/** Null means no such row. Anything else (schema drift, network) still throws. */
export async function getApplication(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toApplication(data as ApplicationRow) : null;
}

export async function createApplication(input: ApplicationInput, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .insert({ ...toRow(input), user_id: userId })
    .select(APPLICATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toApplication(data as ApplicationRow);
}

export async function updateApplication(
  id: string,
  input: Partial<ApplicationInput>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update(toRow(input))
    .eq("id", id)
    .select(APPLICATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toApplication(data as ApplicationRow);
}

export async function saveSearchPlan(id: string, plan: SearchPlan) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ search_plan: plan })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteApplication(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
