import { createClient } from "@/lib/supabase/server";
import { friendlyDataError } from "@/lib/supabase/errors";

const LIMITS = {
  ai: 40,
  apollo: 15,
} as const;

const MESSAGES = {
  ai: "Daily AI limit reached. It resets at midnight. Try again tomorrow.",
  apollo:
    "Daily email-reveal limit reached. Searching people is still free; reveals reset at midnight.",
} as const;

export type QuotaKind = keyof typeof LIMITS;

/** Spends one unit. Returns an error string when the day's cap is hit. */
export async function consumeQuota(
  kind: QuotaKind
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_quota", {
    p_kind: kind,
  });

  if (error) {
    return { ok: false, error: friendlyDataError(error.message) };
  }
  if (data === false) {
    return { ok: false, error: MESSAGES[kind] };
  }
  return { ok: true };
}
