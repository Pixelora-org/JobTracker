"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_COLORS } from "@/lib/constants";
import { SOURCES, STATUSES, TRACKS, type Application } from "@/lib/types";
import { cn, daysSince, isStale } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell-provider";
import { Button, MicroLabel, Select, StatusPill } from "@/components/ui";

type SortKey = "company" | "role" | "status" | "dateApplied" | "updated";

export function ApplicationsTable({
  applications,
}: {
  applications: Application[];
}) {
  const { searchQuery, openEditApplication, openCreateApplication } =
    useAppShell();
  const [status, setStatus] = useState("");
  const [track, setTrack] = useState("");
  const [source, setSource] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    let list = [...applications];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
      );
    }
    if (status) list = list.filter((a) => a.status === status);
    if (track) list = list.filter((a) => a.track === track);
    if (source) list = list.filter((a) => a.source === source);

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const val = (app: Application) => {
        switch (sortKey) {
          case "company":
            return app.company.toLowerCase();
          case "role":
            return app.role.toLowerCase();
          case "status":
            return app.status;
          case "dateApplied":
            return app.dateApplied ?? "";
          case "updated":
          default:
            return app.updatedAt;
        }
      };
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [applications, searchQuery, status, track, source, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "company" || key === "role" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
          <label className="flex flex-col gap-1">
            <MicroLabel>Status</MicroLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <MicroLabel>Track</MicroLabel>
            <Select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">All</option>
              {TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <MicroLabel>Source</MicroLabel>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <p className="font-mono text-[11px] text-muted">
          {rows.length} application{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
          <h2 className="text-base font-medium">No applications match</h2>
          <p className="mt-1 text-sm text-muted">
            Adjust filters or add a new application.
          </p>
          <Button className="mt-4" onClick={() => openCreateApplication()}>
            Add application
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-background/70">
              <tr>
                {(
                  [
                    ["company", "Company"],
                    ["role", "Role"],
                    ["status", "Status"],
                    ["dateApplied", "Applied"],
                    ["updated", "Updated"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted hover:text-text"
                    >
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Track
                  </span>
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((app) => {
                const stale = isStale(app);
                const days = daysSince(app.updatedAt);
                return (
                  <tr
                    key={app.id}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      stale && "bg-stale-bg"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-medium text-text hover:text-accent"
                      >
                        {app.company}
                      </Link>
                      {stale ? (
                        <span className="ml-2 font-mono text-[10px] uppercase text-stale">
                          stale
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{app.role}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill
                        status={app.status}
                        color={STATUS_COLORS[app.status]}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-muted">
                      {app.dateApplied
                        ? app.dateApplied.slice(0, 10)
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-muted">
                      {days === null ? "-" : `${days}d`}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted">
                      {app.track}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditApplication(app)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
