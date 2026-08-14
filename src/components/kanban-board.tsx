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
import {
  ACTIVE_KANBAN_COLUMNS,
  CLOSED_KANBAN_COLUMNS,
  KANBAN_COLUMNS,
  STATUS_COLORS,
  WRITE_OFF_DAYS,
} from "@/lib/constants";
import type { Application, Status } from "@/lib/types";
import { cn, daysSince, isStale, isWriteOffCandidate } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell-provider";
import { ErrorBanner } from "@/components/ui";

const COLUMN_LABEL: Record<Status, string> = {
  Wishlist: "Wishlist",
  Applied: "Applied",
  "OA/Assessment": "OA",
  "Phone Screen": "Phone",
  Interview: "Interview",
  Offer: "Offer",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
  Ghosted: "Ghosted",
};

type StageId = Status | "Closed";

function ApplicationCard({
  app,
  overlay,
  onWriteOff,
  writingOff,
}: {
  app: Application;
  overlay?: boolean;
  onWriteOff?: () => void;
  writingOff?: boolean;
}) {
  const stale = isStale(app);
  const writeOff = isWriteOffCandidate(app);
  const days = daysSince(app.updatedAt);
  const color = STATUS_COLORS[app.status];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface border-l-[3px] p-3.5",
        "transition-[box-shadow,border-color] duration-200",
        writeOff && "ring-1 ring-stale/40",
        stale && !writeOff && "ring-1 ring-stale/20",
        overlay && "shadow-md ring-2 ring-accent/25"
      )}
      style={{ borderLeftColor: color }}
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
        {writeOff ? (
          <span className="shrink-0 font-mono text-[10px] uppercase text-stale">
            {WRITE_OFF_DAYS}d
          </span>
        ) : stale ? (
          <span className="shrink-0 font-mono text-[10px] uppercase text-stale">
            stale
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-muted">
          {app.track}
        </span>
        <span
          className="font-mono text-[11px] tabular-nums text-muted"
          title="Days since last update"
        >
          {days === null ? "-" : `${days}d`}
        </span>
      </div>
      {writeOff && onWriteOff ? (
        <button
          type="button"
          disabled={writingOff}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onWriteOff();
          }}
          className="mt-3 w-full rounded-md border border-stale/30 bg-stale-bg px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-stale hover:bg-stale/10 disabled:opacity-50"
        >
          {writingOff ? "Updating…" : "Mark ghosted"}
        </button>
      ) : null}
    </div>
  );
}

function DraggableCard({
  app,
  onWriteOff,
  writingOff,
}: {
  app: Application;
  onWriteOff: () => void;
  writingOff: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id, data: { app } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
      }}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <ApplicationCard
        app={app}
        onWriteOff={onWriteOff}
        writingOff={writingOff}
      />
    </div>
  );
}

function StageTab({
  id,
  label,
  count,
  color,
  selected,
  onSelect,
}: {
  id: StageId;
  label: string;
  count: number;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-accent-soft text-text"
          : "text-muted hover:bg-background hover:text-text",
        isOver && "ring-1 ring-accent"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-mono text-[11px] tabular-nums text-muted">
        {count}
      </span>
    </button>
  );
}

function groupByStatus(apps: Application[]) {
  const map = Object.fromEntries(
    KANBAN_COLUMNS.map((s) => [s, [] as Application[]])
  ) as Record<Status, Application[]>;
  for (const app of apps) {
    if (map[app.status]) map[app.status].push(app);
  }
  return map;
}

function defaultStage(byStatus: Record<Status, Application[]>): StageId {
  const preferred: Status[] = ["Applied", ...ACTIVE_KANBAN_COLUMNS];
  for (const status of preferred) {
    if (byStatus[status]?.length) return status;
  }
  const closed = CLOSED_KANBAN_COLUMNS.reduce(
    (sum, status) => sum + byStatus[status].length,
    0
  );
  return closed > 0 ? "Closed" : "Wishlist";
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
  const [writingOffId, setWritingOffId] = useState<string | null>(null);
  const [stage, setStage] = useState<StageId>(() =>
    defaultStage(groupByStatus(initialApplications))
  );
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

  const byStatus = useMemo(() => groupByStatus(filtered), [filtered]);

  const closedCount = CLOSED_KANBAN_COLUMNS.reduce(
    (sum, status) => sum + byStatus[status].length,
    0
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeApp = activeId
    ? apps.find((a) => a.id === activeId) ?? null
    : null;

  const visible =
    stage === "Closed"
      ? CLOSED_KANBAN_COLUMNS.flatMap((status) => byStatus[status])
      : byStatus[stage];

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
      overId === "Closed"
        ? "Ghosted"
        : KANBAN_COLUMNS.includes(overId as Status)
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
    if (CLOSED_KANBAN_COLUMNS.includes(nextStatus)) setStage("Closed");
    else setStage(nextStatus);

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

  function writeOff(appId: string) {
    setError(null);
    const previous = apps;
    setWritingOffId(appId);
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: "Ghosted" } : a))
    );
    setStage("Closed");
    startTransition(async () => {
      const result = await updateApplicationStatusAction(appId, "Ghosted");
      setWritingOffId(null);
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <nav className="flex gap-1 overflow-x-auto lg:w-48 lg:shrink-0 lg:flex-col lg:overflow-visible">
            {ACTIVE_KANBAN_COLUMNS.map((status) => (
              <StageTab
                key={status}
                id={status}
                label={COLUMN_LABEL[status]}
                count={byStatus[status].length}
                color={STATUS_COLORS[status]}
                selected={stage === status}
                onSelect={() => setStage(status)}
              />
            ))}
            <div className="hidden h-px bg-border lg:block" />
            <StageTab
              id="Closed"
              label="Closed"
              count={closedCount}
              color="#9B2C3D"
              selected={stage === "Closed"}
              onSelect={() => setStage("Closed")}
            />
          </nav>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium text-text">
                {stage === "Closed" ? "Closed" : COLUMN_LABEL[stage]}
              </h2>
              <p className="font-mono text-[11px] text-muted">
                {visible.length} · drag onto a stage to move
              </p>
            </div>

            {stage === "Closed" ? (
              <div className="space-y-5">
                {CLOSED_KANBAN_COLUMNS.map((status) => (
                  <ClosedGroup
                    key={status}
                    status={status}
                    apps={byStatus[status]}
                    writingOffId={writingOffId}
                    onWriteOff={writeOff}
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
                Nothing here. Open another stage and drag a card onto{" "}
                {COLUMN_LABEL[stage]}.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((app) => (
                  <DraggableCard
                    key={app.id}
                    app={app}
                    writingOff={writingOffId === app.id}
                    onWriteOff={() => writeOff(app.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeApp ? <ApplicationCard app={activeApp} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ClosedGroup({
  status,
  apps,
  writingOffId,
  onWriteOff,
}: {
  status: Status;
  apps: Application[];
  writingOffId: string | null;
  onWriteOff: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_COLORS[status];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border p-3",
        isOver ? "border-accent bg-accent-soft/40" : "bg-surface"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {COLUMN_LABEL[status]}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {apps.length}
        </span>
      </div>
      {apps.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-muted">Drop here</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <DraggableCard
              key={app.id}
              app={app}
              writingOff={writingOffId === app.id}
              onWriteOff={() => onWriteOff(app.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
