export function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function dossierTitleStyle(id: string): React.CSSProperties {
  return { viewTransitionName: `d-title-${id}` };
}

export function dossierStatusStyle(id: string): React.CSSProperties {
  return { viewTransitionName: `d-status-${id}` };
}

export function staggerStyle(index: number): React.CSSProperties {
  return { ["--stagger" as string]: String(index) } as React.CSSProperties;
}

export function startDossierTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (prefersReducedMotion() || !doc.startViewTransition) {
    update();
    return;
  }
  doc.startViewTransition(update);
}
