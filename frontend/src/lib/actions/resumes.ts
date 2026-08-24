"use server";

import { revalidatePath } from "next/cache";
import {
  createResume,
  createResumeDownloadUrl,
  deleteResume,
} from "@/lib/data/resumes";
import { getUser } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/actions/result";

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export async function createResumeAction(input: {
  label: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!input.label.trim()) {
      return { ok: false, error: "Give this version a name, e.g. Security v2." };
    }

    const resume = await createResume(input, user.id);
    revalidatePath("/resumes");
    return { ok: true, data: { id: resume.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to save resume") };
  }
}

export async function deleteResumeAction(id: string): Promise<ActionResult> {
  try {
    await deleteResume(id);
    revalidatePath("/resumes");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to delete resume") };
  }
}

export async function resumeDownloadUrlAction(
  id: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const url = await createResumeDownloadUrl(id);
    return { ok: true, data: { url } };
  } catch (e) {
    return { ok: false, error: message(e, "Failed to create download link") };
  }
}
