"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { updateApplicationStatusAction } from "@/lib/actions/applications";
import { KANBAN_COLUMNS, STATUS_COLORS } from "@/lib/constants";
import type { Application, Status } from "@/lib/types";
import { cn, daysSince, isStale } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell-provider";
import { ErrorBanner, MicroLabel } from "@/components/ui";

function ApplicationCard({
  app,
  overlay,
}: {
  app: Application;
  overlay?: boolean;
}) {
  const stale = isStale(app);
  const days = daysSince(app.updatedAt);
  const color = STATUS_COLORS[app.status];

  return (
    <div
      className={cn(
        "rounded-md border border-border border-l-[3px] p-3",
        "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        stale && "ring-1 ring-stale/30",
        overlay && "shadow-sm ring-2 ring-accent/30"
      )}
      style={{
        borderLeftColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 7%, white)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/applications/${app.id}`}
            className="block truncate text-sm font-medium text-text hover:text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            {app.company}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted">{app.role}</p>
        </div>
        {stale ? (
          <span className="shrink-0 font-mono text-[10px] uppercase text-stale">
            stale
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">{app.track}</span>
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color }}
          title="Days since last update"
        >
          {days === null ? "-" : `${days}d`}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id, data: { app } });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <ApplicationCard app={app} />
    </div>
  );
}

function Column({
  status,
  apps,
}: {
  status: Status;
  apps: Application[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-lg border bg-background/60",
        "transition-colors duration-200",
        isOver ? "border-accent/50 bg-accent-soft/40" : "border-border"
      )}
      style={
        isOver
          ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 8%, white)` }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <MicroLabel className="normal-case tracking-normal text-text">
            {status}
          </MicroLabel>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {apps.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} />
        ))}
        {apps.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted">Empty</p>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanBoard({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const router = useRouter();
  const { searchQuery } = useAppShell();
  const [apps, setApps] = useState(initialApplications);
  const [baseline, setBaseline] = useState(initialApplications);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (initialApplications !== baseline) {
    setBaseline(initialApplications);
    setApps(initialApplications);
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [apps, searchQuery]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      KANBAN_COLUMNS.map((s) => [s, [] as Application[]])
    ) as Record<Status, Application[]>;
    for (const app of filtered) {
      if (map[app.status]) map[app.status].push(app);
    }
    return map;
  }, [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeApp = activeId
    ? apps.find((a) => a.id === activeId) ?? null
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setError(null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const appId = String(active.id);
    const overId = String(over.id);
    const nextStatus = (
      KANBAN_COLUMNS.includes(overId as Status)
        ? overId
        : apps.find((a) => a.id === overId)?.status
    ) as Status | undefined;

    if (!nextStatus) return;

    const current = apps.find((a) => a.id === appId);
    if (!current || current.status === nextStatus) return;

    const previous = apps;
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a))
    );

    startTransition(async () => {
      const result = await updateApplicationStatusAction(appId, nextStatus);
      if (!result.ok) {
        setApps(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <ErrorBanner message={error} /> : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <Column key={status} status={status} apps={byStatus[status]} />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? <ApplicationCard app={activeApp} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
