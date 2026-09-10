import type { Application, SearchPlan } from "@/lib/types";

/** Hosts that host postings for other companies, so their domain is useless to us. */
const JOB_BOARDS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "dice.com",
  "wellfound.com",
  "angel.co",
  "simplyhired.com",
  "builtin.com",
  "otta.com",
  "handshake.com",
  "joinhandshake.com",
  "google.com",
];

/** Applicant tracking systems that put the employer's slug in the URL. */
const ATS_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workable.com",
  "jobvite.com",
  "smartrecruiters.com",
  "breezy.hr",
  "recruitee.com",
  "teamtailor.com",
  "bamboohr.com",
  "applytojob.com",
  "myworkdayjobs.com",
  "icims.com",
  "taleo.net",
];

const GENERIC_SUBDOMAINS = ["www", "careers", "career", "jobs", "job", "apply", "boards"];

type DomainGuess = {
  domain: string;
  /** Whether we read it off the posting or fell back to the company name. */
  source: "job-link" | "company-name";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baseHost(hostname: string) {
  const parts = hostname.replace(/^www\./, "").split(".");
  while (parts.length > 2 && GENERIC_SUBDOMAINS.includes(parts[0])) parts.shift();
  return parts.join(".");
}

function matchesHost(hostname: string, list: string[]) {
  return list.find((h) => hostname === h || hostname.endsWith(`.${h}`));
}

/**
 * Best guess at the employer's email domain. ATS links carry the employer slug
 * (boards.greenhouse.io/acme, acme.myworkdayjobs.com) so those still tell us
 * something even though the host belongs to the ATS.
 */
export function guessCompanyDomain(app: Application): DomainGuess {
  const fallback: DomainGuess = {
    domain: `${slugify(app.company).replace(/-/g, "")}.com`,
    source: "company-name",
  };

  if (!app.jobUrl) return fallback;

  let url: URL;
  try {
    url = new URL(app.jobUrl);
  } catch {
    return fallback;
  }

  const hostname = url.hostname.toLowerCase();

  if (matchesHost(hostname, JOB_BOARDS)) return fallback;

  const ats = matchesHost(hostname, ATS_HOSTS);
  if (ats) {
    const subdomain = hostname.replace(`.${ats}`, "").split(".")[0];
    const pathSlug = url.pathname.split("/").filter(Boolean)[0];
    const slug =
      subdomain && !GENERIC_SUBDOMAINS.includes(subdomain) && subdomain !== ats
        ? subdomain
        : pathSlug;
    if (slug) {
      return { domain: `${slug.replace(/-/g, "")}.com`, source: "job-link" };
    }
    return fallback;
  }

  const host = baseHost(hostname);
  return host ? { domain: host, source: "job-link" } : fallback;
}

type PeopleSearch = {
  key: string;
  label: string;
  description: string;
  /** Shown to the user so a bad query is obvious before they click. */
  query: string;
  linkedinUrl: string;
  googleUrl: string;
};

function linkedinPeopleUrl(query: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    query
  )}`;
}

function googleProfileUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `site:linkedin.com/in ${query}`
  )}`;
}

/**
 * Turns the AI plan into clickable searches. LinkedIn gets the short query
 * because its free search caps how many operators it accepts; Google gets the
 * boolean one because it handles them well.
 */
export function buildPeopleSearches(
  plan: SearchPlan,
  opts?: { school?: string }
): PeopleSearch[] {
  const searches: PeopleSearch[] = plan.personas.map((persona, index) => ({
    key: `${index}-${persona.label}`,
    label: persona.label,
    description: persona.why,
    query: persona.linkedinQuery,
    linkedinUrl: linkedinPeopleUrl(persona.linkedinQuery),
    googleUrl: googleProfileUrl(persona.googleQuery),
  }));

  const school = opts?.school?.trim();
  if (school) {
    searches.push({
      key: "alumni",
      label: "Alumni",
      description: "Shared school. Consistently the highest response rate.",
      query: `${plan.brand} ${school}`,
      linkedinUrl: linkedinPeopleUrl(`${plan.brand} ${school}`),
      googleUrl: googleProfileUrl(`"${school}" ${plan.brand}`),
    });
  }

  return searches;
}

/** LinkedIn's employee directory for a company. */
export function companyPeopleUrl(slug: string, keyword?: string) {
  const base = `https://www.linkedin.com/company/${slug}/people/`;
  return keyword ? `${base}?keywords=${encodeURIComponent(keyword)}` : base;
}

/** Escape hatch for when the guessed company slug is wrong. */
export function companySearchUrl(name: string) {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
    name
  )}`;
}

export function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
