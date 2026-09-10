"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const delta = value - from;
    const reduced = prefersReducedMotion();
    if (delta === 0 && !reduced) return;

    const duration = reduced ? 0 : Math.min(560, 240 + Math.abs(delta) * 40);
    let frame = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + delta * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown}</>;
}
