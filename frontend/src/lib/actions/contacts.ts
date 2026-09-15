"use server";

import { revalidatePath } from "next/cache";
import {
  apiFindOrCreateContact,
  type ContactCreateRequest,
} from "@/lib/api/contacts";
import { getUser } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";

import type { ActionResult } from "@/lib/actions/result";

function revalidateContactPaths() {
  revalidatePath("/contacts");
  revalidatePath("/applications/[id]", "page");
}

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Find or create a contact from Apollo search results.
 * This action is designed to be called when the user selects a profile
 * from the search results and wants to save it as a contact.
 */
export async function saveContactFromProfileAction(
  input: ContactCreateRequest
): Promise<ActionResult<Contact>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    if (!input.name?.trim() || !input.company?.trim()) {
      return {
        ok: false,
        error: "Contact name and company are required.",
      };
    }

    const contact = await apiFindOrCreateContact(input);
    revalidateContactPaths();

    return { ok: true, data: contact };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to save contact") };
  }
}
