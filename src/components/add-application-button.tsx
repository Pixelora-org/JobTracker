"use client";

import { useAppShell } from "@/components/app-shell-provider";
import { Button } from "@/components/ui";

export function AddApplicationButton() {
  const { openCapture } = useAppShell();
  return (
    <Button type="button" onClick={() => openCapture()}>
      Add application
    </Button>
  );
}
