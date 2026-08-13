"use server";

import { revalidatePath } from "next/cache";
import {
  createApplication,
  deleteApplication,
  updateApplication,
} from "@/lib/data/applications";
import { getUser } from "@/lib/supabase/server";
import type { ApplicationInput, Status } from "@/lib/types";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateAppPaths(id?: string) {
  revalidatePath("/board");
  revalidatePath("/applications");
  if (id) revalidatePath(`/applications/${id}`);
}

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export async function createApplicationAction(
  input: ApplicationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!input.company?.trim() || !input.role?.trim()) {
      return { ok: false, error: "Company and role are required." };
    }

    const app = await createApplication(input, user.id);
    revalidateAppPaths(app.id);
    return { ok: true, data: { id: app.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to create application") };
  }
}

export async function updateApplicationAction(
  id: string,
  input: Partial<ApplicationInput>
): Promise<ActionResult> {
  try {
    await updateApplication(id, input);
    revalidateAppPaths(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to update application") };
  }
}

export async function updateApplicationStatusAction(
  id: string,
  status: Status
): Promise<ActionResult> {
  try {
    await updateApplication(id, { status });
    revalidateAppPaths(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to update status") };
  }
}

export async function deleteApplicationAction(
  id: string
): Promise<ActionResult> {
  try {
    await deleteApplication(id);
    revalidateAppPaths();
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to delete application") };
  }
}
