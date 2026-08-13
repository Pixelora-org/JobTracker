import type { Status } from "./types";

export const STATUS_COLORS: Record<Status, string> = {
  Wishlist: "#94A3B8",
  Applied: "#3352E1",
  "OA/Assessment": "#D89A2E",
  "Phone Screen": "#D89A2E",
  Interview: "#D89A2E",
  Offer: "#1F9D5A",
  Rejected: "#9B2C3D",
  Withdrawn: "#9B2C3D",
  Ghosted: "#9B2C3D",
};

/** Kanban column order (excludes terminal-ish columns that still appear) */
export const KANBAN_COLUMNS: Status[] = [
  "Wishlist",
  "Applied",
  "OA/Assessment",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Ghosted",
];

export const STALE_DAYS = 10;

/** Days after an outreach touchpoint before a follow-up is due. */
export const DEFAULT_FOLLOW_UP_DAYS = 3;

/** Set when the first-run redirect to the strategy page is declined. */
export const SKIP_STRATEGY_COOKIE = "pipeline_skip_strategy";
