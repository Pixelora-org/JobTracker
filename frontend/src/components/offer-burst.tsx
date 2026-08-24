"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function OfferBurst({
  play,
  onDone,
}: {
  play: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!play) return;
    const delay = prefersReducedMotion() ? 0 : 650;
    const timer = window.setTimeout(onDone, delay);
    return () => window.clearTimeout(timer);
  }, [play, onDone]);

  if (!play || prefersReducedMotion()) return null;

  return (
    <div className="offer-burst" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          style={{ ["--a" as string]: `${(360 / 16) * i}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
