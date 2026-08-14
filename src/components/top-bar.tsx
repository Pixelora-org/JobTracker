"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useAppShell } from "@/components/app-shell-provider";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/board", label: "Board" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Table" },
  { href: "/strategy", label: "Strategy" },
  { href: "/contacts", label: "Contacts" },
  { href: "/follow-ups", label: "Follow-ups" },
  { href: "/resumes", label: "Resumes" },
  { href: "/friends", label: "Friends" },
];

export function TopBar({
  email,
  name,
  username,
  followUpCount = 0,
}: {
  email?: string | null;
  name?: string | null;
  username?: string | null;
  followUpCount?: number;
}) {
  const pathname = usePathname();
  const { openCapture, searchQuery, setSearchQuery } = useAppShell();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <Link href="/board" className="shrink-0">
            <span className="font-mono text-sm font-semibold tracking-tight text-text">
              pipeline
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const showBadge =
                item.href === "/follow-ups" && followUpCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-background hover:text-text"
                  )}
                >
                  {item.label}
                  {showBadge ? (
                    <span className="rounded-full bg-stale px-1.5 font-mono text-[10px] tabular-nums text-white">
                      {followUpCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-1 items-center gap-2 lg:justify-end">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or role…"
              className="pl-3"
              aria-label="Search applications"
            />
          </div>
          <Button
            type="button"
            onClick={openCapture}
            className="shrink-0"
            title="Quick add (⌘K)"
          >
            Quick add
          </Button>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[140px] truncate font-mono text-[11px] text-muted sm:inline">
              {username ? `@${username}` : name || email}
            </span>
            <UserButton
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
