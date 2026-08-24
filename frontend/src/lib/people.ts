import { daysSince } from "@/lib/utils";
import type { Contact, Touchpoint } from "@/lib/types";

export type PersonGroup = {
  key: string;
  contactId: string | null;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  company: string;
  title: string | null;
  touchpoints: Touchpoint[];
  lastTouch: string;
  nextFollowUp: string | null;
  openFollowUps: number;
};

function personKey(t: Touchpoint) {
  if (t.contactId) return `id:${t.contactId}`;
  if (t.contactEmail?.trim()) {
    return `email:${t.contactEmail.trim().toLowerCase()}`;
  }
  return `name:${t.contactName.trim().toLowerCase()}|${t.company.trim().toLowerCase()}`;
}

export function groupTouchpointsByPerson(
  touchpoints: Touchpoint[],
  contacts: Contact[] = []
): PersonGroup[] {
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const groups = new Map<string, PersonGroup>();

  for (const t of touchpoints) {
    const key = personKey(t);
    const existing = groups.get(key);
    if (existing) {
      existing.touchpoints.push(t);
      continue;
    }
    const contact = t.contactId ? byId.get(t.contactId) : undefined;
    groups.set(key, {
      key,
      contactId: t.contactId ?? contact?.id ?? null,
      name: contact?.name ?? t.contactName,
      email: contact?.email ?? t.contactEmail ?? null,
      linkedinUrl: contact?.linkedinUrl ?? t.contactLinkedinUrl ?? null,
      company: contact?.company ?? t.company,
      title: contact?.title ?? t.contactTitle ?? null,
      touchpoints: [t],
      lastTouch: t.date,
      nextFollowUp: null,
      openFollowUps: 0,
    });
  }

  for (const group of groups.values()) {
    group.touchpoints.sort((a, b) => (a.date < b.date ? 1 : -1));
    group.lastTouch = group.touchpoints[0]?.date ?? group.lastTouch;

    const open = group.touchpoints.filter(
      (t) => t.followUpDate && !t.followUpDone
    );
    group.openFollowUps = open.filter((t) => {
      const overdue = daysSince(t.followUpDate);
      return overdue !== null && overdue >= 0;
    }).length;
    const upcoming = open
      .map((t) => t.followUpDate!)
      .sort((a, b) => (a < b ? -1 : 1));
    group.nextFollowUp = upcoming[0] ?? null;
  }

  return [...groups.values()].sort((a, b) =>
    a.lastTouch < b.lastTouch ? 1 : -1
  );
}
