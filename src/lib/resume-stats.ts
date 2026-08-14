import type { Application, Status } from "./types";

const MIN_SENT_FOR_COMPARE = 5;

export type ResumeVersionStats = {
  label: string;
  sent: number;
  screens: number;
  interviews: number;
};

export type ResumeInsight = {
  better: string;
  worse: string;
  multiple: number;
} | null;

function stageRank(status: Status): number {
  switch (status) {
    case "Phone Screen":
      return 2;
    case "Interview":
    case "Offer":
      return 3;
    case "Wishlist":
      return 0;
    default:
      return 1;
  }
}

export function resumeStatsFor(
  applications: Application[],
  labels: string[]
): ResumeVersionStats[] {
  return labels.map((label) => {
    const rows = applications.filter(
      (app) => app.resumeVersion?.trim() === label
    );
    let sent = 0;
    let screens = 0;
    let interviews = 0;
    for (const app of rows) {
      const rank = stageRank(app.status);
      if (rank < 1) continue;
      sent += 1;
      if (rank >= 2) screens += 1;
      if (rank >= 3) interviews += 1;
    }
    return { label, sent, screens, interviews };
  });
}

export function resumeInsight(stats: ResumeVersionStats[]): ResumeInsight {
  const ready = stats.filter((s) => s.sent >= MIN_SENT_FOR_COMPARE);
  if (ready.length < 2) return null;

  const withRate = ready.map((s) => ({
    ...s,
    rate: s.screens / s.sent,
  }));
  withRate.sort((a, b) => b.rate - a.rate);
  const best = withRate[0];
  const worst = withRate[withRate.length - 1];
  if (worst.rate === 0) return null;
  if (best.rate < worst.rate * 1.5) return null;

  const multiple = Math.round((best.rate / worst.rate) * 10) / 10;

  return { better: best.label, worse: worst.label, multiple };
}
