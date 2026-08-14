"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
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

    const tp = await createTouchpoint(input, user.id);
    revalidateTouchPaths(tp.applicationId);
    return { ok: true, data: { id: tp.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to create touchpoint") };
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
