const API_KEY = process.env.APOLLO_API_KEY ?? "";
const BASE_URL = "https://api.apollo.io/api/v1";

/** Apollo ORs the titles together, so a handful is plenty. */
const MAX_TITLES = 10;
const PER_PAGE = 10;

const FALLBACK_TITLES = [
  "recruiter",
  "technical recruiter",
  "talent acquisition",
  "university recruiter",
  "sourcer",
];

export const isApolloConfigured = Boolean(API_KEY);

export type OutreachContact = {
  /** Apollo person ID. Reveal takes this and nothing else. */
  id: string;
  firstName: string | null;
  /** Apollo hides the last name until a reveal is paid for, e.g. "Ch***n". */
  maskedName: string;
  /** Set once revealed. */
  fullName: string | null;
  title: string | null;
  organization: string | null;
  /** Whether a reveal would actually return an address. */
  hasEmail: boolean;
  email: string | null;
  emailStatus: string | null;
  linkedinUrl: string | null;
};

export type ContactSearch = {
  domain: string;
  titles: string[];
  total: number;
  contacts: OutreachContact[];
};

type ApolloSearchPerson = {
  id?: string;
  first_name?: string | null;
  last_name_obfuscated?: string | null;
  title?: string | null;
  has_email?: boolean;
  organization?: { name?: string | null } | null;
};

type ApolloPerson = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  title?: string | null;
  email?: string | null;
  email_status?: string | null;
  linkedin_url?: string | null;
  organization?: { name?: string | null } | null;
};

function normalizeDomain(domain: string) {
  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/^@/, "");

  if (!clean.includes(".")) {
    throw new Error("Enter a company domain like acme.com.");
  }
  return clean;
}

async function call<T>(path: string, params: URLSearchParams): Promise<T> {
  if (!isApolloConfigured) {
    throw new Error(
      "Contact lookup is not configured. Add APOLLO_API_KEY to .env.local."
    );
  }

  const response = await fetch(`${BASE_URL}${path}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": API_KEY,
    },
    cache: "no-store",
  });

  // Apollo answers auth failures with plain text, so read the body loosely.
  const raw = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail =
      (body as { message?: string; error?: string } | null)?.message ??
      (body as { error?: string } | null)?.error ??
      raw.slice(0, 200);

    if (response.status === 401) {
      throw new Error("Apollo rejected the API key. Check APOLLO_API_KEY.");
    }
    if (response.status === 403) {
      throw new Error(
        detail ||
          "Apollo denied the request. Free keys need an account registered with a work email."
      );
    }
    if (response.status === 429) {
      throw new Error("Apollo rate limit hit. Try again in a few minutes.");
    }
    throw new Error(detail || `Apollo returned ${response.status}.`);
  }

  return (body ?? {}) as T;
}

/**
 * People at a company matching the plan's target titles. This is Apollo's free
 * search: it returns who exists but masks last names and withholds emails until
 * a per-person reveal is paid for.
 */
export async function findContacts(
  domain: string,
  titles: string[]
): Promise<ContactSearch> {
  const clean = normalizeDomain(domain);

  const wanted = Array.from(
    new Set(
      titles
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .filter((t) => t.length < 60)
    )
  ).slice(0, MAX_TITLES);
  const used = wanted.length ? wanted : FALLBACK_TITLES;

  const params = new URLSearchParams();
  params.set("q_organization_domains_list[]", clean);
  for (const title of used) params.append("person_titles[]", title);
  params.set("per_page", String(PER_PAGE));
  params.set("page", "1");

  const body = await call<{
    people?: ApolloSearchPerson[];
    total_entries?: number;
  }>("/mixed_people/api_search", params);

  const contacts = (body.people ?? [])
    .filter((p): p is ApolloSearchPerson & { id: string } => Boolean(p.id))
    .map((p) => {
      const first = p.first_name?.trim() || null;
      const masked = [first, p.last_name_obfuscated?.trim()]
        .filter(Boolean)
        .join(" ");

      return {
        id: p.id,
        firstName: first,
        maskedName: masked || "Unnamed contact",
        fullName: null,
        title: p.title?.trim() || null,
        organization: p.organization?.name?.trim() || null,
        hasEmail: Boolean(p.has_email),
        email: null,
        emailStatus: null,
        linkedinUrl: null,
      } satisfies OutreachContact;
    })
    // People Apollo can actually produce an address for come first.
    .sort((a, b) => Number(b.hasEmail) - Number(a.hasEmail));

  return {
    domain: clean,
    titles: used,
    total: body.total_entries ?? contacts.length,
    contacts,
  };
}

/**
 * Unmasks one person: full name, work email and LinkedIn URL. Apollo charges a
 * credit only when it actually finds something, so this stays per-person and
 * deliberate rather than running across the whole result list.
 */
export async function revealContact(
  personId: string
): Promise<Partial<OutreachContact>> {
  const params = new URLSearchParams();
  params.set("id", personId);

  const body = await call<{ person?: ApolloPerson | null }>(
    "/people/match",
    params
  );
  const person = body.person;

  if (!person) {
    throw new Error("Apollo had no record for this person.");
  }

  const fullName =
    person.name?.trim() ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    null;

  // Apollo returns a placeholder string when the address is still locked.
  const email =
    person.email && !person.email.includes("email_not_unlocked")
      ? person.email
      : null;

  return {
    fullName,
    firstName: person.first_name?.trim() || null,
    title: person.title?.trim() || null,
    organization: person.organization?.name?.trim() || null,
    email,
    emailStatus: person.email_status?.trim() || null,
    linkedinUrl: person.linkedin_url?.trim() || null,
  };
}
