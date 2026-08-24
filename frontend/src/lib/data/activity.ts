import { createClient } from "@/lib/supabase/server";
import type { Channel, TouchpointType } from "@/lib/types";

export type ActivityLog = {
  applications: string[];
  touchpoints: { date: string; channel: Channel; type: TouchpointType }[];
};

/**
 * The bare timestamps behind goal tracking. Days are bucketed in the user's
 * timezone later, so this fetches a day of slack on either side of the window.
 */
export async function listActivitySince(sinceIso: string): Promise<ActivityLog> {
  const supabase = await createClient();
  const from = new Date(
    new Date(sinceIso).getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  const [applications, touchpoints] = await Promise.all([
    supabase
      .from("applications")
      .select("date_applied")
      .not("date_applied", "is", null)
      .gte("date_applied", from)
      .limit(5000),
    supabase
      .from("touchpoints")
      .select("date, channel, type")
      .gte("date", from)
      .limit(5000),
  ]);

  if (applications.error) throw new Error(applications.error.message);
  if (touchpoints.error) throw new Error(touchpoints.error.message);

  return {
    applications: (applications.data as { date_applied: string }[]).map(
      (r) => r.date_applied
    ),
    touchpoints: touchpoints.data as ActivityLog["touchpoints"],
  };
}
