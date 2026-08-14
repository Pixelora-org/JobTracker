import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import { STALE_DAYS, WRITE_OFF_DAYS } from "./constants";
import type { Application, Status } from "./types";
import clsx from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(...inputs);
}

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(new Date(), d);
}

export function isStale(app: Application): boolean {
  const sinceUpdate = daysSince(app.updatedAt);
  if (sinceUpdate !== null && sinceUpdate >= STALE_DAYS) return true;
  if (app.nextActionDate) {
    const next = parseISO(app.nextActionDate);
    if (isValid(next) && next < new Date()) return true;
  }
  return false;
}

const WRITE_OFF_STATUSES: Status[] = [
  "Applied",
  "OA/Assessment",
  "Phone Screen",
];

/** Quiet early stages with no movement. Interview and Offer are never suggested. */
export function isWriteOffCandidate(app: Application): boolean {
  if (!WRITE_OFF_STATUSES.includes(app.status)) return false;
  const sinceUpdate = daysSince(app.updatedAt);
  if (sinceUpdate === null || sinceUpdate < WRITE_OFF_DAYS) return false;
  if (app.nextActionDate) {
    const next = parseISO(app.nextActionDate);
    if (isValid(next) && next >= new Date()) return false;
  }
  return true;
}

/**
 * Funnel from current status buckets (v1 has no stage history).
 * Rates are stage-to-previous among active pipeline columns.
 */
export function computeConversionFunnel(applications: Application[]): {
  applied: number;
  screen: number;
  interview: number;
  offer: number;
  toScreen: number | null;
  toInterview: number | null;
  toOffer: number | null;
} {
  let applied = 0;
  let screen = 0;
  let interview = 0;
  let offer = 0;

  for (const app of applications) {
    switch (app.status as Status) {
      case "Applied":
      case "OA/Assessment":
        applied += 1;
        break;
      case "Phone Screen":
        screen += 1;
        break;
      case "Interview":
        interview += 1;
        break;
      case "Offer":
        offer += 1;
        break;
      default:
        break;
    }
  }

  const pct = (n: number, d: number) =>
    d === 0 ? null : Math.round((n / d) * 100);

  return {
    applied,
    screen,
    interview,
    offer,
    toScreen: pct(screen, applied),
    toInterview: pct(interview, screen),
    toOffer: pct(offer, interview),
  };
}

export function emptyToUndefined(value?: string | null) {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}
