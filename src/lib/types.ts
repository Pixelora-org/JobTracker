export const TRACKS = [
  "Software Engineering",
  "Cybersecurity",
  "Other",
] as const;

export const STATUSES = [
  "Wishlist",
  "Applied",
  "OA/Assessment",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Ghosted",
] as const;

export const SOURCES = [
  "LinkedIn",
  "Referral",
  "Company site",
  "Career fair",
  "Cold outreach",
  "Other",
] as const;

export const WORK_MODES = ["Remote", "Hybrid", "Onsite"] as const;

export const CHANNELS = ["LinkedIn", "Email", "In person", "Referral"] as const;

export const TOUCHPOINT_TYPES = [
  "Cold outreach",
  "Warm intro",
  "Referral ask",
  "Follow-up",
  "Thank you",
] as const;

export const TOUCHPOINT_STATUSES = [
  "Sent",
  "Replied",
  "No response",
  "Referral confirmed",
] as const;

export type Track = (typeof TRACKS)[number];
export type Status = (typeof STATUSES)[number];
export type Source = (typeof SOURCES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type Channel = (typeof CHANNELS)[number];
export type TouchpointType = (typeof TOUCHPOINT_TYPES)[number];
export type TouchpointStatus = (typeof TOUCHPOINT_STATUSES)[number];

/** A person worth contacting, plus the query that finds them. */
type SearchPersona = {
  label: string;
  why: string;
  /** Exact job titles for the Apollo filter. Absent on plans cached before this shipped. */
  titles?: string[];
  /** Kept short: LinkedIn's free search caps how many operators it accepts. */
  linkedinQuery: string;
  /** Google handles heavy boolean, so this one can be rich. */
  googleQuery: string;
};

export type SearchPlan = {
  brand: string;
  aliases: string[];
  linkedinSlug: string;
  domain: string;
  region?: string | null;
  personas: SearchPersona[];
};

export type Application = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  company: string;
  role: string;
  jobUrl?: string | null;
  track: Track;
  resumeVersion?: string | null;
  status: Status;
  source: Source;
  location?: string | null;
  workMode?: WorkMode | null;
  dateApplied?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
  searchPlan?: SearchPlan | null;
};

export type Contact = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  company: string;
  title?: string | null;
};

export type Touchpoint = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  applicationId?: string | null;
  contactId?: string | null;
  contactName: string;
  company: string;
  channel: Channel;
  type: TouchpointType;
  date: string;
  status: TouchpointStatus;
  notes?: string | null;
  followUpDate?: string | null;
  followUpDone: boolean;
  contactEmail?: string | null;
  contactTitle?: string | null;
  contactLinkedinUrl?: string | null;
};

export const STRATEGY_METRICS = [
  "applications",
  "coldEmails",
  "linkedinOutreach",
  "followUps",
  "referralAsks",
] as const;

export type StrategyMetric = (typeof STRATEGY_METRICS)[number];

export const METRIC_LABELS: Record<StrategyMetric, string> = {
  applications: "Applications",
  coldEmails: "Cold emails",
  linkedinOutreach: "LinkedIn reach-outs",
  followUps: "Follow-ups",
  referralAsks: "Referral asks",
};

/** Rough minutes per unit, used to show what a plan costs you per day. */
export const METRIC_MINUTES: Record<StrategyMetric, number> = {
  applications: 8,
  coldEmails: 5,
  linkedinOutreach: 3,
  followUps: 2,
  referralAsks: 4,
};

export type TargetPeriod = "day" | "week";

export type StrategyTarget = {
  metric: StrategyMetric;
  count: number;
  period: TargetPeriod;
};

/** One stretch of the plan. `weeks: null` runs until the strategy ends. */
export type StrategyPhase = {
  label: string;
  weeks: number | null;
  targets: StrategyTarget[];
};

export type Strategy = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  name: string;
  status: "active" | "archived";
  startDate: string;
  endDate?: string | null;
  /** 0 = Sunday. */
  activeDays: number[];
  timezone: string;
  goalText?: string | null;
  rationale?: string | null;
  phases: StrategyPhase[];
};

export type StrategyInput = {
  name: string;
  startDate: string;
  endDate?: string | null;
  activeDays: number[];
  timezone: string;
  goalText?: string | null;
  rationale?: string | null;
  phases: StrategyPhase[];
};

export type Resume = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  label: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  notes?: string | null;
};

export const RESUME_BUCKET = "resumes";

export type ApplicationInput = {
  company: string;
  role: string;
  jobUrl?: string;
  track: Track;
  resumeVersion?: string;
  status: Status;
  source: Source;
  location?: string;
  workMode?: WorkMode | "";
  dateApplied?: string;
  nextActionDate?: string;
  notes?: string;
};

export type TouchpointInput = {
  applicationId?: string;
  contactId?: string;
  contactName: string;
  company: string;
  channel: Channel;
  type: TouchpointType;
  date: string;
  status: TouchpointStatus;
  notes?: string;
  followUpDate?: string;
  followUpDone?: boolean;
  contactEmail?: string;
  contactTitle?: string;
  contactLinkedinUrl?: string;
};

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  requesterEmail: string | null;
  addresseeEmail: string | null;
  requesterUsername: string | null;
  addresseeUsername: string | null;
  status: "pending" | "accepted";
  createdAt: string;
};

export type JobThread = {
  id: string;
  applicationId: string | null;
  ownerId: string;
  peerId: string;
  company: string;
  role: string;
  jobUrl: string | null;
  createdAt: string;
};

export type JobMessage = {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  createdAt: string;
};
