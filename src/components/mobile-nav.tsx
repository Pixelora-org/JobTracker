"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "@/components/nav-config";
import { cn } from "@/lib/utils";

/** Phone-sized tab bar. Four items is what fits without crowding. */
export function MobileNav({ followUpCount = 0 }: { followUpCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          const badge = item.href === "/contacts" && followUpCount > 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                active ? "text-accent" : "text-muted"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge ? (
                  <span className="absolute -right-2 -top-1 min-w-[15px] rounded-full bg-stale px-1 text-center font-mono text-[9px] leading-[15px] text-white">
                    {followUpCount}
                  </span>
                ) : null}
              </span>
              <span className={cn(active && "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
