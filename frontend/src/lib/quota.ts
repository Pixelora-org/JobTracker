import { createClient } from "@/lib/supabase/server";
import { friendlyDataError } from "@/lib/supabase/errors";

const MESSAGES = {
  ai: "Daily AI limit reached. It resets at midnight. Try again tomorrow.",
  apollo:
    "Daily email-reveal limit reached. Searching people is still free; reveals reset at midnight.",
} as const;

/** The caps themselves live in the consume_quota SQL function. */
type QuotaKind = keyof typeof MESSAGES;

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
