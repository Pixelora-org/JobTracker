"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptFriendAction,
  ignoreFriendAction,
} from "@/lib/actions/friends";
import {
  listBellItemsAction,
  markAllNoticesReadAction,
  markNoticeReadAction,
  type BellItem,
} from "@/lib/actions/notifications";
import {
  acceptPodInviteAction,
  ignorePodInviteAction,
} from "@/lib/actions/pods";
import { cn } from "@/lib/utils";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function NotificationBell({ unreadCount = 0 }: { unreadCount?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function load() {
    setError(null);
    startTransition(async () => {
      const result = await listBellItemsAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data);
    });
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  function go(item: BellItem) {
    if (item.notificationId) {
      void markNoticeReadAction(item.notificationId);
    }
    setOpen(false);
    router.push(item.href);
    router.refresh();
  }

  function act(
    run: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      load();
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-text"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[15px] rounded-full bg-stale px-1 text-center font-mono text-[9px] leading-[15px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-[0_16px_40px_-20px_rgba(18,21,28,0.45)]">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Notifications
            </p>
            {items?.some((i) => i.kind === "notice") ? (
              <button
                type="button"
                className="font-mono text-[10px] uppercase text-accent hover:underline"
                onClick={() =>
                  act(async () => {
                    const r = await markAllNoticesReadAction();
                    return r;
                  })
                }
              >
                Mark read
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="px-3 py-3 text-xs text-[#9B2C3D]">{error}</p>
          ) : pending && !items ? (
            <p className="px-3 py-6 text-sm text-muted">Loading…</p>
          ) : !items?.length ? (
            <p className="px-3 py-6 text-sm text-muted">Nothing new.</p>
          ) : (
            <ul className="max-h-[24rem] divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => go(item)}
                    className="w-full text-left"
                  >
                    <span className="block text-sm font-medium text-text">
                      {item.title}
                    </span>
                    {item.detail ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        {item.detail}
                      </span>
                    ) : null}
                  </button>
                  {item.kind === "friend_invite" && item.friendshipId ? (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(() => acceptFriendAction(item.friendshipId!))
                        }
                        className={cn(
                          "rounded-md bg-accent px-2 py-1 font-mono text-[10px] uppercase text-white"
                        )}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(() => ignoreFriendAction(item.friendshipId!))
                        }
                        className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted"
                      >
                        Ignore
                      </button>
                    </div>
                  ) : null}
                  {item.kind === "pod_invite" && item.podMemberId ? (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(() => acceptPodInviteAction(item.podMemberId!))
                        }
                        className="rounded-md bg-accent px-2 py-1 font-mono text-[10px] uppercase text-white"
                      >
                        Join
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(() => ignorePodInviteAction(item.podMemberId!))
                        }
                        className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted"
                      >
                        Ignore
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
