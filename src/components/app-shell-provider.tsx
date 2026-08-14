"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Application, ApplicationInput } from "@/lib/types";
import { ApplicationSlideOver } from "@/components/application-form";
import { CommandPalette, type Command } from "@/components/command-palette";
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
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo<Command[]>(
    () => [
      { id: "quick-add", group: "Actions", label: "Quick add", run: openCapture },
      {
        id: "manual-add",
        group: "Actions",
        label: "Add application manually",
        run: () => openCreateApplication(),
      },
      { id: "board", group: "Go to", label: "Board", run: () => router.push("/board") },
      {
        id: "table",
        group: "Go to",
        label: "Table view",
        run: () => router.push("/board?view=table"),
      },
      { id: "jobs", group: "Go to", label: "Find jobs", run: () => router.push("/jobs") },
      {
        id: "outreach",
        group: "Go to",
        label: "Outreach",
        run: () => router.push("/contacts"),
      },
      {
        id: "due",
        group: "Go to",
        label: "Due follow-ups",
        run: () => router.push("/contacts?tab=due"),
      },
      { id: "plan", group: "Go to", label: "Plan", run: () => router.push("/strategy") },
      {
        id: "resumes",
        group: "Go to",
        label: "Resumes",
        run: () => router.push("/resumes"),
      },
      {
        id: "friends",
        group: "Go to",
        label: "Friends",
        run: () => router.push("/friends"),
      },
    ],
    [openCapture, openCreateApplication, router]
  );

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
      {paletteOpen ? (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          commands={commands}
        />
      ) : null}
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
