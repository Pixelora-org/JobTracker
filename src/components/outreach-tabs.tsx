"use client";

import { useState } from "react";
import { ContactsTable } from "@/components/contacts-table";
import { FollowUpList } from "@/components/follow-up-list";
import { TouchpointForm } from "@/components/touchpoint-form";
import { TabBar } from "@/components/ui";
import type { Touchpoint } from "@/lib/types";

export type OutreachTab = "all" | "due";

/**
 * Both tabs read the same touchpoints table; Due is the subset whose reminder
 * has arrived. They were separate pages, which made one table look like two.
 */
export function OutreachTabs({
  touchpoints,
  due,
  applicationOptions,
  initialTab,
}: {
  touchpoints: Touchpoint[];
  due: Touchpoint[];
  applicationOptions: { id: string; label: string }[];
  initialTab: OutreachTab;
}) {
  const [tab, setTab] = useState<OutreachTab>(initialTab);

  function pick(next: string) {
    const value = next === "due" ? "due" : "all";
    setTab(value);
    window.history.replaceState(
      null,
      "",
      value === "due" ? "/contacts?tab=due" : "/contacts"
    );
  }

  return (
    <div className="space-y-4">
      <TabBar
        ariaLabel="Outreach views"
        active={tab}
        onSelect={pick}
        items={[
          { id: "all", label: "All outreach" },
          { id: "due", label: "Due", badge: due.length },
        ]}
      />

      {tab === "all" ? (
        <div className="space-y-4">
          <TouchpointForm applicationOptions={applicationOptions} />
          <ContactsTable touchpoints={touchpoints} />
        </div>
      ) : (
        <FollowUpList touchpoints={due} />
      )}
    </div>
  );
}
