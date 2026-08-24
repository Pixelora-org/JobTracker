import { listActivitySince } from "@/lib/data/activity";
import { listApplications } from "@/lib/data/applications";
import { daysWithActivity, recentAverages } from "./progress";
import { computeConversionFunnel } from "@/lib/utils";

const HISTORY_WINDOW_DAYS = 30;
const AVERAGE_WINDOW_DAYS = 14;

/**
 * Below these, a low average means "just started tracking" rather than "cannot
 * sustain more", so proposals must not be scaled down to fit it.
 */
const MIN_ACTIVE_DAYS = 7;
const MIN_APPLICATIONS = 10;

export async function loadPlanningContext(timezone: string) {
  const since = new Date(
    Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [activity, applications] = await Promise.all([
    listActivitySince(since),
    listApplications(),
  ]);

  const activeDays = daysWithActivity(activity, timezone, HISTORY_WINDOW_DAYS);

  return {
    grounded:
      activeDays >= MIN_ACTIVE_DAYS && applications.length >= MIN_APPLICATIONS,
    activeDays,
    averages: recentAverages(activity, timezone, AVERAGE_WINDOW_DAYS),
    funnel: computeConversionFunnel(applications),
    totalApplications: applications.length,
  };
}
