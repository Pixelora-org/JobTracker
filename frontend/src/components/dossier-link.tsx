"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { startDossierTransition } from "@/lib/motion";

export function DossierLink({
  href,
  children,
  className,
  style,
  onClick,
  ...props
}: LinkProps & {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        startDossierTransition(() => {
          router.push(href);
        });
      }}
    >
      {children}
    </Link>
  );
}
