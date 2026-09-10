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
import { ApplicationDialog } from "@/components/application-form";
import { CommandPalette, type Command } from "@/components/command-palette";
import { OfferBurst } from "@/components/offer-burst";
import { QuickCapture } from "@/components/quick-capture";

type ShellContextValue = {
  openCapture: () => void;
  openCreateApplication: (initialValues?: Partial<ApplicationInput>) => void;
  openEditApplication: (app: Application) => void;
  celebrateOffer: () => void;
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
  const [offerBurst, setOfferBurst] = useState(false);

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

  const celebrateOffer = useCallback(() => setOfferBurst(true), []);
  const stopBurst = useCallback(() => setOfferBurst(false), []);

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
      { id: "today", group: "Go to", label: "Today", run: () => router.push("/today") },
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
      { id: "plan", group: "Go to", label: "Strategy", run: () => router.push("/strategy") },
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
      {
        id: "pods",
        group: "Go to",
        label: "Pods",
        run: () => router.push("/pods"),
      },
    ],
    [openCapture, openCreateApplication, router]
  );

  const value = useMemo(
    () => ({
      openCapture,
      openCreateApplication,
      openEditApplication,
      celebrateOffer,
      searchQuery,
      setSearchQuery,
    }),
    [
      openCapture,
      openCreateApplication,
      openEditApplication,
      celebrateOffer,
      searchQuery,
    ]
  );

  return (
    <ShellContext.Provider value={value}>
      <OfferBurst play={offerBurst} onDone={stopBurst} />
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
        resumeOptions={resumeOptions}
        onOffer={celebrateOffer}
      />
      <ApplicationDialog
        open={formOpen}
        application={editing}
        initialValues={prefill}
        resumeOptions={resumeOptions}
        onClose={() => setFormOpen(false)}
        onOffer={celebrateOffer}
      />
    </ShellContext.Provider>
  );
}
