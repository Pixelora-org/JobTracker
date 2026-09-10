import { createClient } from "@/lib/supabase/server";
import type { AppNotification, NotificationType } from "@/lib/types";

type Row = {
  id: string;
  user_id: string;
  actor_id: string | null;
  actor_handle: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const COLUMNS =
  "id, user_id, actor_id, actor_handle, type, title, body, href, read_at, created_at";

function toNotification(row: Row): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorHandle: row.actor_handle,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listNotifications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toNotification);
}

export async function countUnreadNotifications() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createNotification(input: {
  userId: string;
  actorId: string;
  actorHandle: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    actor_id: input.actorId,
    actor_handle: input.actorHandle,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
}
