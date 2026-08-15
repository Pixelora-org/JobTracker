"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { upsertContact } from "@/lib/data/contacts";
import {
  createTouchpoint,
  deleteTouchpoint,
  updateTouchpoint,
} from "@/lib/data/touchpoints";
import { getUser } from "@/lib/supabase/server";
import type { TouchpointInput } from "@/lib/types";

import type { ActionResult } from "@/lib/actions/result";

function revalidateTouchPaths(applicationId?: string | null) {
  revalidatePath("/contacts");
  revalidatePath("/follow-ups");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/board");
}

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export async function createTouchpointAction(
  input: TouchpointInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!input.contactName?.trim() || !input.company?.trim()) {
      return { ok: false, error: "Contact name and company are required." };
    }

    const contact = await upsertContact(
      {
        name: input.contactName,
        company: input.company,
        email: input.contactEmail,
        linkedinUrl: input.contactLinkedinUrl,
        title: input.contactTitle,
      },
      user.id
    );

    const tp = await createTouchpoint(
      { ...input, contactId: contact.id },
      user.id
    );
    revalidateTouchPaths(tp.applicationId);
    return { ok: true, data: { id: tp.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to create touchpoint") };
  }
}

export async function updateTouchpointAction(
  id: string,
  input: Partial<TouchpointInput>
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (input.contactName !== undefined && !input.contactName.trim()) {
      return { ok: false, error: "Contact name is required." };
    }
    if (input.company !== undefined && !input.company.trim()) {
      return { ok: false, error: "Company is required." };
    }

    let patch = { ...input };
    if (input.contactName && input.company) {
      const contact = await upsertContact(
        {
          name: input.contactName,
          company: input.company,
          email: input.contactEmail,
          linkedinUrl: input.contactLinkedinUrl,
          title: input.contactTitle,
        },
        user.id
      );
      patch = { ...patch, contactId: contact.id };
    }

    const tp = await updateTouchpoint(id, patch);
    revalidateTouchPaths(tp.applicationId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to update touchpoint") };
  }
}

export async function completeFollowUpAction(id: string): Promise<ActionResult> {
  try {
    const tp = await updateTouchpoint(id, { followUpDone: true });
    revalidateTouchPaths(tp.applicationId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to close follow-up") };
  }
}

export async function snoozeFollowUpAction(
  id: string,
  days: number
): Promise<ActionResult> {
  try {
    const tp = await updateTouchpoint(id, {
      followUpDate: addDays(new Date(), days).toISOString(),
    });
    revalidateTouchPaths(tp.applicationId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to snooze follow-up") };
  }
}

export async function deleteTouchpointAction(
  id: string,
  applicationId?: string | null
): Promise<ActionResult> {
  try {
    await deleteTouchpoint(id);
    revalidateTouchPaths(applicationId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to delete touchpoint") };
  }
}
