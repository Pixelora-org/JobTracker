import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

export async function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }

  const { getToken } = await auth();
  const token = await getToken();

  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    async accessToken() {
      return token ?? (await auth()).getToken() ?? null;
    },
  });
}

/** Clerk user for the request. Id is the Clerk user id, which RLS matches on. */
export async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  return {
    id: userId,
    email,
    name: user?.fullName ?? user?.firstName ?? null,
    username: user?.username ?? null,
  };
}

/**
 * If this Clerk account's email already owned rows under the old Supabase Auth
 * uuid, rewrite those rows to the Clerk id so friends don't lose their pipeline.
 */
export async function claimLegacyData() {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("claim_legacy_data");
  } catch {
    // Schema may not have been migrated yet; never take down the shell.
  }
}
