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

/** Visible pipeline. Closed statuses collapse into one rail. */
export const ACTIVE_KANBAN_COLUMNS: Status[] = [
  "Wishlist",
  "Applied",
  "OA/Assessment",
  "Phone Screen",
  "Interview",
  "Offer",
];

export const CLOSED_KANBAN_COLUMNS: Status[] = [
  "Rejected",
  "Withdrawn",
  "Ghosted",
];

/** Kanban column order (excludes terminal-ish columns that still appear) */
export const KANBAN_COLUMNS: Status[] = [
  ...ACTIVE_KANBAN_COLUMNS,
  ...CLOSED_KANBAN_COLUMNS,
];

export const STALE_DAYS = 10;

/** Suggest writing off Applied-stage cards with no movement this long. */
export const WRITE_OFF_DAYS = 21;

/** Days after an outreach touchpoint before a follow-up is due. */
export const DEFAULT_FOLLOW_UP_DAYS = 3;
