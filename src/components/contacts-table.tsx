"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CHANNELS,
  TOUCHPOINT_STATUSES,
  type Touchpoint,
} from "@/lib/types";
import { MicroLabel, Select } from "@/components/ui";

export function ContactsTable({
  touchpoints,
}: {
  touchpoints: Touchpoint[];
}) {
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    return touchpoints.filter((t) => {
      if (channel && t.channel !== channel) return false;
      if (status && t.status !== status) return false;
      return true;
    });
  }, [touchpoints, channel, status]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
        <label className="flex flex-col gap-1">
          <MicroLabel>Channel</MicroLabel>
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <MicroLabel>Status</MicroLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {TOUCHPOINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
          <h2 className="text-base font-medium">No touchpoints yet</h2>
          <p className="mt-1 text-sm text-muted">
            Log outreach from an application detail page or add contacts as you
            network.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-background/70">
              <tr>
                {["Contact", "Company", "Channel", "Type", "Date", "Status", ""].map(
                  (h) => (
                    <th
                      key={h || "link"}
                      className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5 font-medium">{t.contactName}</td>
                  <td className="px-3 py-2.5 text-muted">{t.company}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted">
                    {t.channel}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{t.type}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-muted">
                    {t.date.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted">
                    {t.status}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {t.applicationId ? (
                      <Link
                        href={`/applications/${t.applicationId}`}
                        className="text-sm text-accent hover:underline"
                      >
                        App
                      </Link>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
