/** Map PostgREST / JWT failures into something a person can act on. */
export function friendlyDataError(raw: string) {
  const text = raw.toLowerCase();
  if (
    text.includes("no suitable key") ||
    text.includes("wrong key type") ||
    text.includes("invalid jwt")
  ) {
    return "Supabase is not accepting your Clerk session yet. In Clerk, open Integrations → Supabase and copy the Clerk domain. In Supabase, go to Authentication → Sign in / Providers → Third-party, add Clerk, and paste that domain. Then re-run supabase/schema.sql.";
  }
  if (text.includes("does not exist")) {
    return "A table is missing. Run supabase/schema.sql in the Supabase SQL editor (safe to re-run).";
  }
  return raw;
}
