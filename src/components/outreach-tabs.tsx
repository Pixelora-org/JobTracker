"use client";

import { useEffect, useState } from "react";
import { FollowUpList } from "@/components/follow-up-list";
import { PeopleList } from "@/components/people-list";
import { TouchpointForm } from "@/components/touchpoint-form";
import { Button, TabBar } from "@/components/ui";
import type { Contact, Touchpoint } from "@/lib/types";

export type OutreachTab = "people" | "due";

export function OutreachTabs({
  touchpoints,
  contacts,
  due,
  applicationOptions,
  initialTab,
  aiEnabled,
}: {
  touchpoints: Touchpoint[];
  contacts: Contact[];
  due: Touchpoint[];
  applicationOptions: { id: string; label: string }[];
  initialTab: OutreachTab;
  aiEnabled: boolean;
}) {
  const [tab, setTab] = useState<OutreachTab>(initialTab);
  const [compose, setCompose] = useState(false);

  function pick(next: string) {
    const value = next === "due" ? "due" : "people";
    setTab(value);
    window.history.replaceState(
      null,
      "",
      value === "due" ? "/contacts?tab=due" : "/contacts"
    );
  }

  useEffect(() => {
    if (!compose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compose]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabBar
          ariaLabel="Outreach views"
          active={tab}
          onSelect={pick}
          items={[
            { id: "people", label: "People" },
            { id: "due", label: "Due", badge: due.length },
          ]}
        />
        <Button type="button" onClick={() => setCompose(true)}>
          Log outreach
        </Button>
      </div>

      {tab === "people" ? (
        <PeopleList
          touchpoints={touchpoints}
          contacts={contacts}
          applicationOptions={applicationOptions}
          aiEnabled={aiEnabled}
        />
      ) : (
        <FollowUpList touchpoints={due} />
      )}

      {compose ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            <button
              type="button"
              aria-label="Close overlay"
              className="fixed inset-0 bg-[#12151C]/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setCompose(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-outreach-title"
              className="relative z-10 max-h-[calc(100vh-4rem)] w-full max-w-[800px] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-[0_24px_60px_-20px_rgba(18,21,28,0.45)] animate-fade-in sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Outreach
                  </p>
                  <h2
                    id="log-outreach-title"
                    className="mt-1 text-lg font-medium text-text"
                  >
                    Log a message
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCompose(false)}
                >
                  Close
                </Button>
              </div>
              <TouchpointForm
                applicationOptions={applicationOptions}
                allowPaste
                aiEnabled={aiEnabled}
                onDone={() => setCompose(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
