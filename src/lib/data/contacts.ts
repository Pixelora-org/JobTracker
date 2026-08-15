import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import { emptyToUndefined } from "@/lib/utils";

type ContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, user_id, name, email, linkedin_url, company, title, created_at, updated_at";

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    linkedinUrl: row.linkedin_url,
    company: row.company,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeEmail(email?: string | null) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

export type ContactInput = {
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  company: string;
  title?: string | null;
};

export async function listContacts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(COLUMNS)
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as ContactRow[]).map(toContact);
}

/**
 * Find an existing person by email, or by name + company, then fill any blanks.
 * Creates a row when nothing matches.
 */
export async function upsertContact(
  input: ContactInput,
  userId: string
): Promise<Contact> {
  const supabase = await createClient();
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const company = input.company.trim();

  let existing: ContactRow | null = null;

  if (email) {
    const { data, error } = await supabase
      .from("contacts")
      .select(COLUMNS)
      .eq("user_id", userId)
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    existing = data as ContactRow | null;
  }

  if (!existing) {
    let query = supabase
      .from("contacts")
      .select(COLUMNS)
      .eq("user_id", userId)
      .ilike("name", name)
      .ilike("company", company)
      .limit(1);
    if (email) query = query.is("email", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    existing = (data as ContactRow[] | null)?.[0] ?? null;
  }

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (name && name !== existing.name) patch.name = name;
    if (company && company !== existing.company) patch.company = company;
    if (email && !existing.email) patch.email = email;
    if (input.linkedinUrl?.trim() && !existing.linkedin_url) {
      patch.linkedin_url = input.linkedinUrl.trim();
    }
    if (input.title?.trim() && !existing.title) {
      patch.title = input.title.trim();
    }
    if (Object.keys(patch).length === 0) return toContact(existing);

    const { data, error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", existing.id)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return toContact(data as ContactRow);
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name,
      company,
      email,
      linkedin_url: emptyToUndefined(input.linkedinUrl ?? undefined) ?? null,
      title: emptyToUndefined(input.title ?? undefined) ?? null,
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toContact(data as ContactRow);
}
