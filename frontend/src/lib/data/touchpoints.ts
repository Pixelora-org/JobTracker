import { createClient } from "@/lib/supabase/server";
import type {
  Channel,
  Touchpoint,
  TouchpointInput,
  TouchpointStatus,
  TouchpointType,
} from "@/lib/types";
import { emptyToUndefined } from "@/lib/utils";

type TouchpointRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  contact_id: string | null;
  contact_name: string;
  company: string;
  channel: Channel;
  type: TouchpointType;
  date: string;
  status: TouchpointStatus;
  notes: string | null;
  follow_up_date: string | null;
  follow_up_done: boolean;
  contact_email: string | null;
  contact_title: string | null;
  contact_linkedin_url: string | null;
  created_at: string;
  updated_at: string;
};

const TOUCHPOINT_COLUMNS =
  "id, user_id, application_id, contact_id, contact_name, company, channel, type, date, status, notes, follow_up_date, follow_up_done, contact_email, contact_title, contact_linkedin_url, created_at, updated_at";

function toTouchpoint(row: TouchpointRow): Touchpoint {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    contactId: row.contact_id,
    contactName: row.contact_name,
    company: row.company,
    channel: row.channel,
    type: row.type,
    date: row.date,
    status: row.status,
    notes: row.notes,
    followUpDate: row.follow_up_date,
    followUpDone: row.follow_up_done,
    contactEmail: row.contact_email,
    contactTitle: row.contact_title,
    contactLinkedinUrl: row.contact_linkedin_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<TouchpointInput>) {
  const row: Record<string, unknown> = {};
  if (input.applicationId !== undefined)
    row.application_id = emptyToUndefined(input.applicationId) ?? null;
  if (input.contactId !== undefined)
    row.contact_id = emptyToUndefined(input.contactId) ?? null;
  if (input.contactName !== undefined)
    row.contact_name = input.contactName.trim();
  if (input.company !== undefined) row.company = input.company.trim();
  if (input.channel !== undefined) row.channel = input.channel;
  if (input.type !== undefined) row.type = input.type;
  if (input.date !== undefined) row.date = input.date;
  if (input.status !== undefined) row.status = input.status;
  if (input.notes !== undefined) row.notes = emptyToUndefined(input.notes) ?? null;
  if (input.followUpDate !== undefined)
    row.follow_up_date = emptyToUndefined(input.followUpDate) ?? null;
  if (input.followUpDone !== undefined) row.follow_up_done = input.followUpDone;
  if (input.contactEmail !== undefined)
    row.contact_email = emptyToUndefined(input.contactEmail) ?? null;
  if (input.contactTitle !== undefined)
    row.contact_title = emptyToUndefined(input.contactTitle) ?? null;
  if (input.contactLinkedinUrl !== undefined)
    row.contact_linkedin_url = emptyToUndefined(input.contactLinkedinUrl) ?? null;
  return row;
}

export async function listTouchpoints(opts?: {
  channel?: string;
  status?: string;
  applicationId?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("touchpoints")
    .select(TOUCHPOINT_COLUMNS)
    .order("date", { ascending: false })
    .limit(500);

  if (opts?.channel) query = query.eq("channel", opts.channel);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.applicationId) query = query.eq("application_id", opts.applicationId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data as TouchpointRow[]).map(toTouchpoint);
}

/** Outreach whose follow-up date has arrived and that is still open. */
export async function listDueFollowUps() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("touchpoints")
    .select(TOUCHPOINT_COLUMNS)
    .eq("follow_up_done", false)
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", new Date().toISOString())
    .order("follow_up_date", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data as TouchpointRow[]).map(toTouchpoint);
}

export async function countDueFollowUps() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("touchpoints")
    .select("id", { count: "exact", head: true })
    .eq("follow_up_done", false)
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", new Date().toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createTouchpoint(input: TouchpointInput, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("touchpoints")
    .insert({ ...toRow(input), user_id: userId })
    .select(TOUCHPOINT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toTouchpoint(data as TouchpointRow);
}

export async function updateTouchpoint(
  id: string,
  input: Partial<TouchpointInput>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("touchpoints")
    .update(toRow(input))
    .eq("id", id)
    .select(TOUCHPOINT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toTouchpoint(data as TouchpointRow);
}

export async function deleteTouchpoint(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("touchpoints").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
