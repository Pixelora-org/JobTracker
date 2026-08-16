"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { useAppShell } from "@/components/app-shell-provider";
import {
  FriendsIcon,
  NAV_ITEMS,
  PodsIcon,
  ResumesIcon,
  isNavActive,
} from "@/components/nav-config";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function TopBar({
  email,
  name,
  username,
  followUpCount = 0,
  bellCount = 0,
}: {
  email?: string | null;
  name?: string | null;
  username?: string | null;
  followUpCount?: number;
  bellCount?: number;
}) {
  const pathname = usePathname();
  const { openCapture } = useAppShell();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <Link href="/today" className="shrink-0">
            <span className="font-mono text-sm font-semibold tracking-tight text-text">
              pipeline
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item, pathname);
            const badge = item.href === "/contacts" && followUpCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-background hover:text-text"
                )}
              >
                {item.label}
                {badge ? (
                  <span className="rounded-full bg-stale px-1.5 font-mono text-[10px] tabular-nums text-white">
                    {followUpCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <NotificationBell unreadCount={bellCount} />
          <Link
            href="/friends"
            aria-label="Friends"
            aria-current={pathname.startsWith("/friends") ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors",
              pathname.startsWith("/friends")
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-background hover:text-text"
            )}
          >
            <FriendsIcon className="h-4 w-4 lg:hidden" />
            <span className="hidden lg:inline">Friends</span>
          </Link>
          <Link
            href="/pods"
            aria-label="Pods"
            aria-current={pathname.startsWith("/pods") ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors",
              pathname.startsWith("/pods")
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-background hover:text-text"
            )}
          >
            <PodsIcon className="h-4 w-4 lg:hidden" />
            <span className="hidden lg:inline">Pods</span>
          </Link>
          <Button type="button" onClick={openCapture} title="Quick add (⌘K)">
            Quick add
          </Button>
          <span className="hidden max-w-[140px] truncate font-mono text-[11px] text-muted xl:inline">
            {username ? `@${username}` : name || email}
          </span>
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }}>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Resumes"
                href="/resumes"
                labelIcon={<ResumesIcon className="h-4 w-4" />}
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
    </header>
  );
}
