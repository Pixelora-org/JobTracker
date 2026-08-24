"use client";

import { useMemo, useState } from "react";
import { toDateInput } from "@/lib/dates";
import { groupTouchpointsByPerson, type PersonGroup } from "@/lib/people";
import { staggerStyle } from "@/lib/motion";
import type { Contact, Touchpoint } from "@/lib/types";
import { TouchpointForm } from "@/components/touchpoint-form";
import { TouchpointTimeline } from "@/components/touchpoint-timeline";
import { Button, MicroLabel } from "@/components/ui";

export function PeopleList({
  touchpoints,
  contacts,
  applicationOptions,
  aiEnabled,
}: {
  touchpoints: Touchpoint[];
  contacts: Contact[];
  applicationOptions: { id: string; label: string }[];
  aiEnabled: boolean;
}) {
  const people = useMemo(
    () => groupTouchpointsByPerson(touchpoints, contacts),
    [touchpoints, contacts]
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [loggingFor, setLoggingFor] = useState<PersonGroup | null>(null);

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
        <h2 className="text-base font-medium">No people yet</h2>
        <p className="mt-1 text-sm text-muted">
          Log a message and they show up here, grouped so two emails to the same
          person are one row.
        </p>
      </div>
    );
  }

  return (
    <ul className="stagger-in space-y-2">
      {people.map((person, i) => {
        const open = openKey === person.key;
        return (
          <li
            key={person.key}
            style={staggerStyle(i)}
            className="rounded-lg border border-border bg-surface"
          >
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : person.key)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{person.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {person.company}
                  {person.title ? ` · ${person.title}` : ""}
                </p>
                {person.email ? (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-accent">
                    {person.email}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[11px] text-muted">
                  {person.touchpoints.length} touch
                  {person.touchpoints.length === 1 ? "" : "es"} ·{" "}
                  {toDateInput(person.lastTouch)}
                </p>
                {person.openFollowUps > 0 ? (
                  <p className="mt-1 font-mono text-[11px] text-stale">
                    {person.openFollowUps} due
                  </p>
                ) : person.nextFollowUp ? (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    Next {toDateInput(person.nextFollowUp)}
                  </p>
                ) : null}
              </div>
            </button>

            {open ? (
              <div className="space-y-3 border-t border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <MicroLabel>Timeline</MicroLabel>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setLoggingFor((current) =>
                        current?.key === person.key ? null : person
                      )
                    }
                  >
                    {loggingFor?.key === person.key
                      ? "Close"
                      : "Log another"}
                  </Button>
                </div>
                {loggingFor?.key === person.key ? (
                  <TouchpointForm
                    defaultCompany={person.company}
                    initialValues={{
                      contactName: person.name,
                      company: person.company,
                      contactEmail: person.email ?? "",
                      contactTitle: person.title ?? "",
                      contactLinkedinUrl: person.linkedinUrl ?? "",
                    }}
                    applicationOptions={applicationOptions}
                    allowPaste
                    aiEnabled={aiEnabled}
                    onDone={() => setLoggingFor(null)}
                  />
                ) : null}
                <TouchpointTimeline
                  touchpoints={person.touchpoints}
                  applicationOptions={applicationOptions}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
