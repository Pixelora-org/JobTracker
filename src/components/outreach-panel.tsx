"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  draftOutreachAction,
  findContactsAction,
  revealContactAction,
  searchPlanAction,
} from "@/lib/actions/outreach";
import { createTouchpointAction } from "@/lib/actions/touchpoints";
import type { OutreachDraft } from "@/lib/ai/outreach";
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
      {copied ? "Copied" : label}
    </Button>
  );
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] text-accent">
          {n}
        </span>
        <h3 className="text-sm font-medium text-text">{title}</h3>
        {hint ? (
          <span className="font-mono text-[11px] text-muted">{hint}</span>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function ContactRow({
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
    <li
      className={cn(
        "rounded-md border transition-colors",
        selected
          ? "border-accent bg-accent-soft/50"
          : "border-border bg-surface",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full px-3 py-2 text-left"
      >
        <span className="block text-sm font-medium text-text">
          {contact.fullName ?? contact.maskedName}
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          {contact.title ?? "Title unknown"}
        </span>
        {contact.email ? (
          <span className="mt-1 block truncate font-mono text-[11px] text-accent">
            {contact.email}
            {contact.emailStatus ? (
              <span className="text-muted"> · {contact.emailStatus}</span>
            ) : null}
          </span>
        ) : null}
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-1.5">
        {contact.linkedinUrl ? (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-accent hover:underline"
          >
            LinkedIn ↗
          </a>
        ) : (
          <span className="font-mono text-[10px] text-muted">
            {contact.email
              ? "revealed"
              : contact.hasEmail
                ? "email on file"
                : "no email on file"}
          </span>
        )}

        {contact.email ? (
          <CopyButton text={contact.email} label="Copy email" />
        ) : (
          <button
            type="button"
            disabled={revealing || !contact.hasEmail}
            onClick={onReveal}
            className="font-mono text-[11px] text-accent hover:underline disabled:opacity-40 disabled:no-underline"
            title={
              contact.hasEmail
                ? "Uses one Apollo credit"
                : "Apollo has no address for this person"
            }
          >
            {revealing ? "revealing…" : "Reveal email"}
          </button>
        )}
      </div>
    </li>
  );
}

export function OutreachPanel({
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
  const [showAbout, setShowAbout] = useState(false);
  const [channel, setChannel] = useState<Channel>("Email");
  const [result, setResult] = useState<ContactSearch | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [finding, startFind] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [logging, startLog] = useTransition();
  const [planning, startPlan] = useTransition();
  const [followUpDate, setFollowUpDate] = useState(() =>
    addDaysInput(todayInput(), DEFAULT_FOLLOW_UP_DAYS)
  );
  const planRequested = useRef(Boolean(application.searchPlan));

  const searches = useMemo(
    () => (plan ? buildPeopleSearches(plan, { school }) : []),
    [plan, school],
  );

  // The plan already worked out which titles matter for this role, so the
  // contact search reuses them instead of a generic "recruiter" sweep.
  const searchTitles = useMemo(
    () => (plan?.personas ?? []).flatMap((p) => p.titles ?? []),
    [plan],
  );

  const selected = useMemo(
    () => result?.contacts.find((c) => c.id === selectedId) ?? null,
    [result, selectedId],
  );

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

  // The plan is what makes every search below specific, so fetch it on open
  // rather than making the first visit start with an empty panel.
  useEffect(() => {
    if (planRequested.current || !aiEnabled) return;
    buildPlan();
  });

  function findContacts() {
    setError(null);
    startFind(async () => {
      const res = await findContactsAction(domain, searchTitles);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      setSelectedId(null);
      if (!res.data.contacts.length) {
        setError(
          `Nobody at ${res.data.domain} matched those titles. Try a different domain, or use the LinkedIn searches above and enter the contact by hand.`,
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
    // Before a reveal the last name is masked, so only the first name is usable.
    setContactName(contact.fullName ?? contact.firstName ?? "");
    setContactTitle(contact.title ?? "");
    // Cleared when unrevealed, so a previous person's address can't ride along.
    setContactEmail(contact.email ?? "");
    setDraft(null);
    setLogged(false);
  }

  function generateDraft() {
    setError(null);
    setLogged(false);
    startDraft(async () => {
      const res = await draftOutreachAction({
        applicationId: application.id,
        contactName: contactName.trim() || undefined,
        contactTitle: contactTitle.trim() || undefined,
        about,
        channel,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraft(res.data);
    });
  }

  function logTouchpoint() {
    setError(null);

    startLog(async () => {
      const res = await createTouchpointAction({
        applicationId: application.id,
        contactName: contactName.trim(),
        company: application.company,
        channel,
        type: "Cold outreach",
        date: dateInputToIso(todayInput()),
        status: "Sent",
        notes:
          channel === "Email"
            ? (draft?.emailBody ?? "")
            : (draft?.connectionNote ?? ""),
        followUpDate: followUpDate
          ? dateInputToIso(followUpDate)
          : undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactTitle: contactTitle.trim() || undefined,
        contactLinkedinUrl: selected?.linkedinUrl ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLogged(true);
      router.refresh();
    });
  }

  const canLog = Boolean(contactName.trim());

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <MicroLabel>Outreach</MicroLabel>
          <h2 className="mt-1 text-base font-medium">
            Find someone at {plan?.brand ?? application.company}
          </h2>
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          {(["Email", "LinkedIn"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                channel === c
                  ? "bg-accent text-white"
                  : "text-muted hover:text-text",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <Step
        n={1}
        title="Find someone worth contacting"
        hint={
          plan ? (
            <>
              searching as <span className="text-text">{plan.brand}</span>
              {plan.region ? ` · ${plan.region}` : ""}
            </>
          ) : undefined
        }
      >
        {!plan ? (
          <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted">
            {planning
              ? "Working out who to contact at this company…"
              : aiEnabled
                ? "No search plan yet."
                : "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local to plan searches."}
            {!planning && aiEnabled ? (
              <button
                type="button"
                onClick={() => buildPlan()}
                className="ml-2 font-mono text-[11px] text-accent hover:underline"
              >
                Build one
              </button>
            ) : null}
          </div>
        ) : null}

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {searches.map((s) => (
            <li
              key={s.key}
              className="flex flex-col justify-between gap-2 rounded-md border border-border p-3 transition-colors hover:border-accent/40"
            >
              <div>
                <p className="text-sm font-medium text-text">{s.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  {s.description}
                </p>
                <p className="mt-1.5 truncate font-mono text-[10px] text-muted/80">
                  {s.query}
                </p>
              </div>
              <div className="flex gap-1.5">
                <a
                  href={s.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-md bg-accent-soft px-2.5 py-1 text-center font-mono text-[11px] text-accent hover:bg-accent hover:text-white"
                >
                  LinkedIn ↗
                </a>
                <a
                  href={s.googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-md border border-border px-2.5 py-1 text-center font-mono text-[11px] text-muted hover:bg-background hover:text-text"
                >
                  Google ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {plan ? (
              <>
                <a
                  href={companyPeopleUrl(plan.linkedinSlug, "recruiter")}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-accent hover:underline"
                >
                  Browse all employees ↗
                </a>
                <a
                  href={companySearchUrl(plan.brand)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-muted hover:text-text"
                  title="Company slugs are guessed, so use this if that link lands on the wrong company"
                >
                  wrong company?
                </a>
                <button
                  type="button"
                  disabled={planning}
                  onClick={() => buildPlan(true)}
                  className="font-mono text-[11px] text-muted hover:text-text disabled:opacity-50"
                >
                  {planning ? "rethinking…" : "regenerate"}
                </button>
              </>
            ) : null}
          </div>
          <label className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted">
              Your school
            </span>
            <Input
              value={school}
              placeholder="Add it for alumni search"
              onChange={(e) => setSchool(e.target.value)}
              className="h-8 w-56 text-xs"
            />
          </label>
        </div>
        {plan?.aliases.length ? (
          <p className="text-xs text-muted">
            Also known as {plan.aliases.join(", ")}. Try those if a search comes
            back thin.
          </p>
        ) : null}
      </Step>

      <Step
        n={2}
        title="Get their email"
        hint={
          apolloEnabled
            ? "searching is free · revealing costs one credit"
            : "add APOLLO_API_KEY to enable"
        }
      >
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
            />
            <span className="mt-1 block text-xs text-muted">
              {plan
                ? `Resolved from ${plan.brand}. Edit if it looks wrong.`
                : guess.source === "job-link"
                  ? "Read from the job link. Edit if it looks wrong."
                  : "Guessed from the company name. Edit if it looks wrong."}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={finding || !apolloEnabled}
            onClick={findContacts}
          >
            {finding ? "Searching…" : "Find people"}
          </Button>
        </div>

        {result ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <MicroLabel>
                {result.contacts.length} of {result.total} at {result.domain}
              </MicroLabel>
              <span className="truncate font-mono text-[11px] text-muted">
                {result.titles.join(" · ")}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {result.contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  selected={selectedId === c.id}
                  revealing={revealingId === c.id}
                  onSelect={() => selectContact(c)}
                  onReveal={() => reveal(c)}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </Step>

      <Step n={3} title="Write it and log it">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <MicroLabel>Who you are contacting</MicroLabel>
            <Input
              value={contactName}
              placeholder="Jordan Lee"
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <MicroLabel>Their title</MicroLabel>
            <Input
              value={contactTitle}
              placeholder="Technical Recruiter"
              onChange={(e) => setContactTitle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <MicroLabel>Their email</MicroLabel>
            <Input
              type="email"
              value={contactEmail}
              placeholder="jordan@acme.com"
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAbout((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-text"
          >
            {showAbout ? "− " : "+ "}About you (used in every draft)
          </button>
          {showAbout ? (
            <Textarea
              value={about}
              placeholder="CS senior at Northeastern, security co-op at Acme, built a SIEM detection pipeline in Python…"
              onChange={(e) => setAbout(e.target.value)}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              ? "Writing…"
              : contactName.trim()
                ? `Draft ${channel.toLowerCase()} to ${contactName.trim().split(" ")[0]}`
                : `Draft ${channel.toLowerCase()}`}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={logging || !canLog}
            onClick={logTouchpoint}
            title={canLog ? undefined : "Add a contact name first"}
          >
            {logging ? "Logging…" : "Log as sent"}
          </Button>
          <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
            Follow up
            <Input
              type="date"
              className="h-8 w-auto font-mono"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </label>
          {logged ? (
            <span className="font-mono text-[11px] text-[#1F9D5A]">
              Logged · follow up {followUpDate}
            </span>
          ) : null}
        </div>

        {draft ? (
          <div className="space-y-3 rounded-md border border-border bg-background/50 p-3">
            {channel === "LinkedIn" ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <MicroLabel>
                    Connection note · {draft.connectionNote.length}/300
                  </MicroLabel>
                  <CopyButton text={draft.connectionNote} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">
                  {draft.connectionNote}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <MicroLabel>Subject</MicroLabel>
                  <CopyButton text={draft.emailSubject} />
                </div>
                <p className="mt-2 text-sm font-medium text-text">
                  {draft.emailSubject}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <MicroLabel>Body</MicroLabel>
                  <div className="flex gap-1.5">
                    <CopyButton text={draft.emailBody} />
                    {contactEmail.trim() ? (
                      <a
                        href={mailtoUrl(
                          contactEmail.trim(),
                          draft.emailSubject,
                          draft.emailBody,
                        )}
                        className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-[#2945c9]"
                      >
                        Open in mail
                      </a>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">
                  {draft.emailBody}
                </p>
              </div>
            )}
            <p className="text-xs text-muted">
              Read it before you send. Replace [Your name] and cut anything that
              does not sound like you.
            </p>
          </div>
        ) : null}
      </Step>
    </section>
  );
}
