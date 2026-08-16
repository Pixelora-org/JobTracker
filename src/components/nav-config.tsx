/**
 * One definition of the primary navigation, shared by the desktop bar and the
 * mobile tab bar so the two can never drift.
 *
 * `match` exists because a section owns more routes than it links to: the board
 * owns application detail pages, and outreach owns the legacy follow-ups path.
 */
export type NavItem = {
  href: string;
  label: string;
  match: string[];
  icon: (props: { className?: string }) => React.ReactElement;
};

function Icon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
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
      {children}
    </svg>
  );
}

export function TodayIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Icon>
  );
}

export function BoardIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="7" rx="1.5" />
    </Icon>
  );
}

export function FindIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function OutreachIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 21 11.5Z" />
    </Icon>
  );
}

export function PlanIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  );
}

export function ResumesIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  );
}

export function FriendsIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.2-4.4" />
    </Icon>
  );
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", match: ["/today"], icon: TodayIcon },
  {
    href: "/board",
    label: "Board",
    match: ["/board", "/applications"],
    icon: BoardIcon,
  },
  { href: "/jobs", label: "Find", match: ["/jobs"], icon: FindIcon },
  {
    href: "/contacts",
    label: "Outreach",
    match: ["/contacts", "/follow-ups"],
    icon: OutreachIcon,
  },
];

export function isNavActive(item: NavItem, pathname: string) {
  return item.match.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );
}
