import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Browser client. Pass Clerk's session.getToken so storage RLS sees the user. */
export function createClient(getToken: () => Promise<string | null>) {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    async accessToken() {
      return getToken();
    },
  });
}
