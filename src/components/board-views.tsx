"use client";

import { useState } from "react";
import { ApplicationsTable } from "@/components/applications-table";
import { KanbanBoard } from "@/components/kanban-board";
import { useAppShell } from "@/components/app-shell-provider";
import { Input } from "@/components/ui";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BoardView = "kanban" | "table";

const VIEWS: { id: BoardView; label: string }[] = [
  { id: "kanban", label: "Board" },
  { id: "table", label: "Table" },
];

/**
 * Both views render the same `listApplications()` result, so this is a display
 * switch, not a second page. The URL is updated without a navigation to keep
 * the view shareable without refetching.
 */
export function BoardViews({
  applications,
  initialView,
}: {
  applications: Application[];
  initialView: BoardView;
}) {
  const [view, setView] = useState<BoardView>(initialView);
  const { searchQuery, setSearchQuery } = useAppShell();

  function pick(next: BoardView) {
    setView(next);
    window.history.replaceState(
      null,
      "",
      next === "table" ? "/board?view=table" : "/board"
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Board view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pick(v.id)}
                className={cn(
                  "rounded-[7px] px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:text-text"
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search company or role…"
          aria-label="Search applications"
          className="sm:max-w-xs"
        />
      </div>

      {view === "kanban" ? (
        <KanbanBoard initialApplications={applications} />
      ) : (
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}
