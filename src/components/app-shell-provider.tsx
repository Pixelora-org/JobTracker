"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Application, ApplicationInput } from "@/lib/types";
import { ApplicationSlideOver } from "@/components/application-form";
import { QuickCapture } from "@/components/quick-capture";

type ShellContextValue = {
  openCapture: () => void;
  openCreateApplication: (initialValues?: Partial<ApplicationInput>) => void;
  openEditApplication: (app: Application) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useAppShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShellProvider");
  return ctx;
}

export function AppShellProvider({
  children,
  resumeOptions = [],
}: {
  children: React.ReactNode;
  resumeOptions?: string[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [prefill, setPrefill] = useState<Partial<ApplicationInput> | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const openCapture = useCallback(() => setCaptureOpen(true), []);

  const openCreateApplication = useCallback(
    (initialValues?: Partial<ApplicationInput>) => {
      setEditing(null);
      setPrefill(initialValues);
      setFormOpen(true);
    },
    []
  );

  const openEditApplication = useCallback((app: Application) => {
    setEditing(app);
    setPrefill(undefined);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({
      openCapture,
      openCreateApplication,
      openEditApplication,
      searchQuery,
      setSearchQuery,
    }),
    [openCapture, openCreateApplication, openEditApplication, searchQuery]
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      <QuickCapture
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onApplicationDraft={(draft) => {
          setCaptureOpen(false);
          openCreateApplication(draft.values);
        }}
        onManual={() => {
          setCaptureOpen(false);
          openCreateApplication();
        }}
      />
      <ApplicationSlideOver
        open={formOpen}
        application={editing}
        initialValues={prefill}
        resumeOptions={resumeOptions}
        onClose={() => setFormOpen(false)}
      />
    </ShellContext.Provider>
  );
}
