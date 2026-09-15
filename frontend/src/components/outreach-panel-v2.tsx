"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  draftOutreachAction,
  findContactsAction,
  revealContactAction,
  searchPlanAction,
} from "@/lib/actions/outreach";
import { saveContactFromProfileAction } from "@/lib/actions/contacts";
import { createTouchpointAction } from "@/lib/actions/touchpoints";
import {
  OUTREACH_TEMPLATE_LABELS,
  OUTREACH_TEMPLATES,
  type OutreachDraft,
  type OutreachTemplate,
  type ContactProfile,
} from "@/lib/ai/outreach";
import type { ContactSearch, OutreachContact } from "@/lib/outreach/apollo";
import { DEFAULT_FOLLOW_UP_DAYS } from "@/lib/constants";
import { addDaysInput, dateInputToIso, todayInput } from "@/lib/dates";
import {
  buildPeopleSearches,
  companyPeopleUrl,
  companySearchUrl,
  guessCompanyDomain,
  mailtoUrl,
} from "@/lib/outreach/links";
import type { Application, SearchPlan } from "@/lib/types";
import { useStoredText } from "@/lib/use-stored-text";
import {
  Button,
  ErrorBanner,
  Input,
  MicroLabel,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const SCHOOL_KEY = "pipeline:school";
const ABOUT_KEY = "pipeline:about";

type Channel = "LinkedIn" | "Email";

function guessTemplate(title: string): OutreachTemplate {
  const t = title.toLowerCase();
  if (/(recruit|talent|sourcer|university|campus|early career)/.test(t)) {
    return "recruiter";
  }
  if (/(alumni|alum)/.test(t)) return "alum";
  return "teammate";
}

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "✓ Copied" : label}
    </Button>
  );
}

function ProfileCard({
  contact,
  selected,
  revealing,
  onSelect,
  onReveal,
}: {
  contact: OutreachContact;
  selected: boolean;
  revealing: boolean;
  onSelect: () => void;
  onReveal: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border-2 transition-all duration-200",
        selected
          ? "border-accent bg-accent-soft/30 shadow-md"
          : "border-border bg-surface hover:border-accent/30 hover:shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text text-base leading-tight truncate">
              {contact.fullName ?? contact.maskedName}
            </h4>
            {contact.title ? (
              <p className="mt-1 text-sm text-muted leading-snug line-clamp-2">
                {contact.title}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted italic">Title unknown</p>
            )}
          </div>
          {selected && (
            <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      </button>

      <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {contact.linkedinUrl ? (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn ↗
            </a>
          ) : null}
          {contact.email ? (
            <span className="truncate font-mono text-xs text-muted">
              {contact.email}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">
              {contact.hasEmail ? "Email on file" : "No email"}
            </span>
          )}
        </div>

        {!contact.email && contact.hasEmail && (
          <button
            type="button"
            disabled={revealing}
            onClick={(e) => {
              e.stopPropagation();
              onReveal();
            }}
            className="text-xs font-medium text-accent hover:underline disabled:opacity-40 disabled:no-underline"
            title="Uses one Apollo credit"
          >
            {revealing ? "Revealing…" : "Reveal"}
          </button>
        )}
      </div>
    </div>
  );
}

export function OutreachPanelV2({
  application,
  apolloEnabled,
  aiEnabled,
}: {
  application: Application;
  apolloEnabled: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const guess = useMemo(() => guessCompanyDomain(application), [application]);

  const [plan, setPlan] = useState<SearchPlan | null>(
    application.searchPlan ?? null,
  );
  const [domain, setDomain] = useState(
    application.searchPlan?.domain || guess.domain,
  );
  const [school, setSchool] = useStoredText(SCHOOL_KEY);
  const [about, setAbout] = useStoredText(ABOUT_KEY);
  const [channel, setChannel] = useState<Channel>("Email");
  const [template, setTemplate] = useState<OutreachTemplate>("recruiter");
  const [result, setResult] = useState<ContactSearch | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [editedDraft, setEditedDraft] = useState<OutreachDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [savedContactId, setSavedContactId] = useState<string | null>(null);
  const [finding, startFind] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [logging, startLog] = useTransition();
  const [planning, startPlan] = useTransition();
  const [saving, startSave] = useTransition();
  const [followUpDate, setFollowUpDate] = useState(() =>
    addDaysInput(todayInput(), DEFAULT_FOLLOW_UP_DAYS)
  );
  const planRequested = useRef(Boolean(application.searchPlan));

  const searches = useMemo(
    () => (plan ? buildPeopleSearches(plan, { school }) : []),
    [plan, school],
  );

  const searchTitles = useMemo(
    () => (plan?.personas ?? []).flatMap((p) => p.titles ?? []),
    [plan],
  );

  const selected = useMemo(
    () => result?.contacts.find((c) => c.id === selectedId) ?? null,
    [result, selectedId],
  );

  const currentDraft = editedDraft ?? draft;

  function buildPlan(refresh = false) {
    setError(null);
    planRequested.current = true;
    startPlan(async () => {
      const res = await searchPlanAction(application.id, { refresh });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan(res.data);
      setDomain(res.data.domain);
    });
  }

  useEffect(() => {
    if (planRequested.current || !aiEnabled) return;
    buildPlan();
  });

  function findContacts() {
    setError(null);
    setSelectedId(null);
    setDraft(null);
    setEditedDraft(null);
    setSavedContactId(null);
    startFind(async () => {
      const res = await findContactsAction(domain, searchTitles);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      if (!res.data.contacts.length) {
        setError(
          `No contacts found at ${res.data.domain} matching those titles. Try a different domain or use the LinkedIn searches above.`,
        );
      }
    });
  }

  async function reveal(contact: OutreachContact) {
    setError(null);
    setRevealingId(contact.id);
    const res = await revealContactAction(contact.id);
    setRevealingId(null);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const revealed = { ...contact, ...res.data };
    setResult((prev) =>
      prev
        ? {
            ...prev,
            contacts: prev.contacts.map((c) =>
              c.id === contact.id ? revealed : c,
            ),
          }
        : prev,
    );
    selectContact(revealed);
  }

  function selectContact(contact: OutreachContact) {
    setSelectedId(contact.id);
    setTemplate(guessTemplate(contact.title ?? ""));
    setDraft(null);
    setEditedDraft(null);
    setLogged(false);
    setSavedContactId(null);
  }

  function saveSelectedContact() {
    if (!selected) return;
    setError(null);
    startSave(async () => {
      const res = await saveContactFromProfileAction({
        name: selected.fullName ?? selected.firstName ?? selected.maskedName,
        email: selected.email ?? null,
        linkedinUrl: selected.linkedinUrl ?? null,
        company: application.company,
        title: selected.title ?? null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedContactId(res.data.id);
    });
  }

  function generateDraft() {
    if (!selected) return;
    setError(null);
    setLogged(false);
    setEditedDraft(null);

    const contactProfile: ContactProfile = {
      name: selected.fullName ?? selected.maskedName,
      title: selected.title,
      company: application.company,
      linkedinUrl: selected.linkedinUrl,
      school: school.trim() || null,
    };

    startDraft(async () => {
      const res = await draftOutreachAction({
        applicationId: application.id,
        contactProfile,
        about,
        channel,
        template,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraft(res.data);
    });
  }

  function logTouchpoint() {
    if (!selected || !currentDraft) return;
    setError(null);

    startLog(async () => {
      const res = await createTouchpointAction({
        applicationId: application.id,
        contactId: savedContactId ?? undefined,
        contactName: selected.fullName ?? selected.maskedName,
        company: application.company,
        channel,
        type: "Cold outreach",
        date: dateInputToIso(todayInput()),
        status: "Sent",
        notes:
          channel === "Email"
            ? currentDraft.emailBody
            : currentDraft.connectionNote,
        followUpDate: followUpDate
          ? dateInputToIso(followUpDate)
          : undefined,
        contactEmail: selected.email ?? undefined,
        contactTitle: selected.title ?? undefined,
        contactLinkedinUrl: selected.linkedinUrl ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLogged(true);
      router.refresh();
    });
  }

  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <MicroLabel>Outreach Agent v1</MicroLabel>
          <h2 className="mt-1 text-lg font-semibold">
            Find someone at {plan?.brand ?? application.company}
          </h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["Email", "LinkedIn"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "px-4 py-2 font-medium text-sm transition-colors",
                channel === c
                  ? "bg-accent text-white"
                  : "text-muted hover:text-text hover:bg-background",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {/* Step 1: Search Plan */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
            1
          </div>
          <h3 className="text-base font-semibold text-text">Find Contacts</h3>
          {plan && (
            <span className="text-xs text-muted">
              · {plan.brand} {plan.region ? `· ${plan.region}` : ""}
            </span>
          )}
        </div>

        {!plan ? (
          <div className="rounded-md border border-dashed border-border bg-background/50 px-6 py-8 text-center">
            <p className="text-sm text-muted">
              {planning
                ? "Building search plan…"
                : aiEnabled
                  ? "No search plan yet. Build one to get started."
                  : "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local to enable AI search planning."}
            </p>
            {!planning && aiEnabled && (
              <Button
                type="button"
                onClick={() => buildPlan()}
                className="mt-4"
              >
                Build Search Plan
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searches.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-text">{s.label}</p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={s.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-md bg-accent px-3 py-2 text-center text-xs font-medium text-white hover:bg-accent/90"
                    >
                      LinkedIn ↗
                    </a>
                    <a
                      href={s.googleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-md border border-border px-3 py-2 text-center text-xs font-medium text-muted hover:bg-background hover:text-text"
                    >
                      Google ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted">Your school</span>
                <Input
                  value={school}
                  placeholder="For alumni search"
                  onChange={(e) => setSchool(e.target.value)}
                  className="h-9 w-56 text-sm"
                />
              </label>
              <div className="flex items-center gap-3 ml-auto">
                {plan && (
                  <>
                    <a
                      href={companyPeopleUrl(plan.linkedinSlug, "recruiter")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Browse all employees ↗
                    </a>
                    <button
                      type="button"
                      disabled={planning}
                      onClick={() => buildPlan(true)}
                      className="text-xs text-muted hover:text-text disabled:opacity-50"
                    >
                      {planning ? "Regenerating…" : "Regenerate plan"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Apollo Search */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted">
                    Company domain
                  </label>
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="acme.com"
                    className="mt-1"
                  />
                  <span className="mt-1 block text-xs text-muted">
                    {plan
                      ? `Resolved from ${plan.brand}`
                      : "Guessed from company name"}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={finding || !apolloEnabled}
                  onClick={findContacts}
                  title={
                    apolloEnabled
                      ? undefined
                      : "Add APOLLO_API_KEY to enable contact search"
                  }
                >
                  {finding ? "Searching…" : "Search Contacts"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Step 2: Select Profile */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-semibold text-text">
              Select a Profile
            </h3>
            <span className="text-xs text-muted">
              · {result.contacts.length} of {result.total} found
            </span>
          </div>

          {result.contacts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.contacts.map((c) => (
                  <ProfileCard
                    key={c.id}
                    contact={c}
                    selected={selectedId === c.id}
                    revealing={revealingId === c.id}
                    onSelect={() => selectContact(c)}
                    onReveal={() => reveal(c)}
                  />
                ))}
              </div>

              {selected && (
                <div className="rounded-lg border border-accent/30 bg-accent-soft/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted">
                        Selected contact
                      </p>
                      <p className="text-base font-semibold text-text">
                        {selected.fullName ?? selected.maskedName}
                      </p>
                      {selected.title && (
                        <p className="text-sm text-muted">{selected.title}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={saving || !!savedContactId}
                      onClick={saveSelectedContact}
                    >
                      {saving
                        ? "Saving…"
                        : savedContactId
                          ? "✓ Saved"
                          : "Save Contact"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted italic">
              No contacts found. Try adjusting the domain or search criteria.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Generate & Edit Draft */}
      {selected && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-semibold text-text">
              Generate Message
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <MicroLabel>Message type</MicroLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {OUTREACH_TEMPLATES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTemplate(id)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      template === id
                        ? "border-accent bg-accent text-white"
                        : "border-border text-muted hover:text-text hover:border-accent/50",
                    )}
                  >
                    {OUTREACH_TEMPLATE_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <MicroLabel>About you (used in drafts)</MicroLabel>
              <Textarea
                value={about}
                placeholder="CS senior at Northeastern, security co-op at Acme, built a SIEM detection pipeline in Python…"
                onChange={(e) => setAbout(e.target.value)}
                className="mt-2"
                rows={3}
              />
              {!about.trim() && (
                <p className="mt-1 text-xs text-muted">
                  Two or three proof points keep the draft from going generic.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                disabled={drafting || !aiEnabled}
                onClick={generateDraft}
                title={
                  aiEnabled
                    ? undefined
                    : "Add GOOGLE_GENERATIVE_AI_API_KEY to enable"
                }
              >
                {drafting
                  ? "Generating…"
                  : draft
                    ? "Regenerate Draft"
                    : "Generate Draft"}
              </Button>
            </div>
          </div>

          {/* Draft Display & Edit */}
          {currentDraft && (
            <div className="space-y-4 rounded-lg border border-border bg-background p-5">
              {channel === "LinkedIn" ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <MicroLabel>
                      Connection Note · {(editedDraft?.connectionNote ?? draft?.connectionNote ?? "").length}/300
                    </MicroLabel>
                    <div className="flex gap-2">
                      <CopyButton
                        text={currentDraft.connectionNote}
                        label="Copy"
                      />
                      {selected.linkedinUrl && (
                        <a
                          href={selected.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                        >
                          Open Profile ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={currentDraft.connectionNote}
                    onChange={(e) =>
                      setEditedDraft({
                        ...(editedDraft ?? draft ?? ({} as OutreachDraft)),
                        connectionNote: e.target.value.slice(0, 300),
                      })
                    }
                    className="font-normal"
                    rows={4}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <MicroLabel>Subject</MicroLabel>
                      <CopyButton
                        text={currentDraft.emailSubject}
                        label="Copy"
                      />
                    </div>
                    <Input
                      value={currentDraft.emailSubject}
                      onChange={(e) =>
                        setEditedDraft({
                          ...(editedDraft ?? draft ?? ({} as OutreachDraft)),
                          emailSubject: e.target.value,
                        })
                      }
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <MicroLabel>Body</MicroLabel>
                      <div className="flex gap-2">
                        <CopyButton
                          text={currentDraft.emailBody}
                          label="Copy"
                        />
                        {selected.email && (
                          <a
                            href={mailtoUrl(
                              selected.email,
                              currentDraft.emailSubject,
                              currentDraft.emailBody,
                            )}
                            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90"
                          >
                            Open in Mail
                          </a>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={currentDraft.emailBody}
                      onChange={(e) =>
                        setEditedDraft({
                          ...(editedDraft ?? draft ?? ({} as OutreachDraft)),
                          emailBody: e.target.value,
                        })
                      }
                      className="font-normal"
                      rows={12}
                    />
                  </div>
                </>
              )}
              <p className="text-xs text-muted">
                Edit the draft to match your voice. Remove placeholders and generic phrases.
              </p>
            </div>
          )}

          {/* Log Touchpoint */}
          {currentDraft && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={logging}
                onClick={logTouchpoint}
              >
                {logging ? "Logging…" : "Log as Sent"}
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted">
                Follow up
                <Input
                  type="date"
                  className="h-9 w-auto"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </label>
              {logged && (
                <span className="text-sm font-medium text-[#1F9D5A]">
                  ✓ Logged · follow up {followUpDate}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
