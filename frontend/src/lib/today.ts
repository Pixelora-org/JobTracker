import { METRIC_LABELS, type Application, type Touchpoint } from "@/lib/types";
import type { StrategyProgress } from "@/lib/strategy/progress";
import { daysSince, isStale } from "@/lib/utils";

export type TodayAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

const CLOSED = new Set(["Rejected", "Withdrawn", "Ghosted", "Offer"]);

/**
 * Three concrete next moves. Follow-ups first, then silent applications,
 * then whatever the plan still owes today.
 */
export function buildTodayActions(input: {
  applications: Application[];
  touchpoints: Touchpoint[];
  dueFollowUps: Touchpoint[];
  progress: StrategyProgress | null;
}): TodayAction[] {
  const actions: TodayAction[] = [];
  const outreachByApp = new Set(
    input.touchpoints
      .map((t) => t.applicationId)
      .filter((id): id is string => Boolean(id))
  );

  for (const t of input.dueFollowUps) {
    if (actions.length >= 3) break;
    const overdue = daysSince(t.followUpDate);
    actions.push({
      id: `follow-${t.id}`,
      title: `Follow up with ${t.contactName}`,
      detail:
        overdue !== null && overdue > 0
          ? `${t.company} · ${t.channel} · ${overdue}d overdue`
          : `${t.company} · ${t.channel} · due today`,
      href: t.applicationId
        ? `/applications/${t.applicationId}?tab=outreach`
        : "/contacts?tab=due",
    });
  }

  const open = input.applications.filter((a) => !CLOSED.has(a.status));

  for (const app of open) {
    if (actions.length >= 3) break;
    if (outreachByApp.has(app.id)) continue;
    if (app.status === "Wishlist") continue;
    actions.push({
      id: `reach-${app.id}`,
      title: `Find someone at ${app.company}`,
      detail: `${app.role} · no outreach logged`,
      href: `/applications/${app.id}?tab=outreach`,
    });
  }

  for (const app of open.filter((a) => a.status === "Wishlist")) {
    if (actions.length >= 3) break;
    actions.push({
      id: `apply-${app.id}`,
      title: `Apply to ${app.company}`,
      detail: `${app.role} · still on Wishlist`,
      href: `/applications/${app.id}`,
    });
  }

  if (input.progress) {
    for (const m of input.progress.metrics) {
      if (actions.length >= 3) break;
      const actual = m.period === "week" ? m.weekActual : m.todayActual;
      const target = m.period === "week" ? m.weekTarget : m.todayTarget;
      const left = Math.max(target - actual, 0);
      if (left === 0) continue;
      const label = METRIC_LABELS[m.metric].toLowerCase();
      actions.push({
        id: `quota-${m.metric}`,
        title:
          m.metric === "applications"
            ? `Apply to ${left} more`
            : m.metric === "followUps"
              ? `Send ${left} follow-up${left === 1 ? "" : "s"}`
              : `Log ${left} ${label}`,
        detail:
          m.period === "week"
            ? `${actual} of ${target} this week`
            : `${actual} of ${target} today`,
        href:
          m.metric === "applications"
            ? "/jobs"
            : m.metric === "followUps"
              ? "/contacts?tab=due"
              : "/contacts",
      });
    }
  }

  for (const app of open.filter((a) => isStale(a))) {
    if (actions.length >= 3) break;
    if (actions.some((x) => x.id.endsWith(app.id))) continue;
    const days = daysSince(app.updatedAt);
    actions.push({
      id: `stale-${app.id}`,
      title: `Nudge ${app.company}`,
      detail: `${app.role} · no movement in ${days ?? "?"}d`,
      href: `/applications/${app.id}`,
    });
  }

  return actions.slice(0, 3);
}
