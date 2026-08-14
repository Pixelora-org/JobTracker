"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";

type ClerkFieldError = { code?: string; message?: string; longMessage?: string };

/** Clerk throws a shaped object, not an Error, for validation failures. */
function clerkErrors(e: unknown): ClerkFieldError[] {
  if (e && typeof e === "object" && "errors" in e) {
    const errors = (e as { errors?: unknown }).errors;
    if (Array.isArray(errors)) return errors as ClerkFieldError[];
  }
  return [];
}

export async function setUsernameAction(
  input: string
): Promise<ActionResult> {
  const username = input.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { ok: false, error: "Use 3 to 20 letters, numbers, or underscores." };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You are signed out." };

  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, { username });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    const [first] = clerkErrors(e);
    const code = first?.code ?? "";
    if (code === "form_identifier_exists") {
      return { ok: false, error: "That username is taken. Try another one." };
    }
    if (code === "form_param_unknown" || code === "form_username_not_allowed") {
      return {
        ok: false,
        error:
          "Usernames are off in Clerk. Enable Username under Configure, then Email, Phone, Username.",
      };
    }
    return {
      ok: false,
      error:
        first?.longMessage ??
        first?.message ??
        (e instanceof Error ? e.message : "Could not save that username."),
    };
  }
}
