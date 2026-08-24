/**
 * No jobs API exposes visa status, so sponsorship is inferred. Two sources:
 * wording in the posting, and whether the employer is a frequent H-1B filer.
 * Treat it as a hint for triage, never as an answer.
 */
export type SponsorshipSignal = "sponsors" | "likely" | "blocked" | "unknown";

/**
 * Phrases that rule sponsorship out. Checked first because an explicit "no" is
 * far more reliable than any other signal here, including the employer list.
 */
const BLOCKING = [
  /\bno\b[^.]{0,30}\bsponsorship\b/,
  /\bsponsorship\b[^.]{0,30}\b(not|never)\b[^.]{0,20}\b(available|offered|provided)\b/,
  /\b(will|can|do|does|are|is)\s+not\b[^.]{0,40}\bsponsor(?:s|ed|ing|ship)?\b/,
  /\b(unable|not\s+able|ineligible|not\s+eligible)\b[^.]{0,40}\bsponsor(?:s|ed|ing|ship)?\b/,
  /\bwithout\b[^.]{0,40}\b(sponsorship|visa\s+support)\b/,
  /\bauthoriz(?:ed|ation)\s+to\s+work\b[^.]{0,60}\bwithout\b/,
  /\b(u\.?s\.?|united\s+states)\s+citizen(?:ship)?\b[^.]{0,30}\b(required|only|must)\b/,
  /\bmust\s+be\s+a\s+(u\.?s\.?|united\s+states)\s+citizen\b/,
  /\bsecurity\s+clearance\b/,
];

/** Phrases that state sponsorship outright. */
const SPONSORING = [
  /\bh-?1-?b\b/,
  /\b(visa|immigration)\s+sponsorship\b[^.]{0,30}\b(available|offered|provided|considered)\b/,
  /\b(we|will|can|do)\s+(are\s+)?(happy\s+to\s+|willing\s+to\s+|able\s+to\s+)?sponsor\b/,
  /\bsponsorship\s+(is\s+)?(available|offered|provided)\b/,
  /\bopen\s+to\s+(visa\s+)?sponsorship\b/,
  /\bvisa\s+support\s+(is\s+)?(available|offered|provided)\b/,
];

const LEGAL_SUFFIX =
  /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|plc|gmbh|llp|lp|group|holdings|technologies|technology|labs|solutions|services|systems|usa|us|na)\b/g;

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Employers that file H-1B petitions in volume every year, per the public USCIS
 * disclosure data. Presence here means the company has sponsored before, not
 * that this particular role is open to it. Normalized on the way in so both
 * sides of the comparison cannot drift apart.
 */
const KNOWN_SPONSORS = new Set(
  [
    // Big tech and semiconductors
    "amazon", "google", "alphabet", "microsoft", "meta", "facebook", "apple",
    "netflix", "nvidia", "intel", "ibm", "oracle", "salesforce", "adobe",
    "cisco", "qualcomm", "vmware", "dell", "hewlett packard", "broadcom",
    "amd", "micron", "applied materials", "texas instruments", "arm",
    // Consumer and platform
    "paypal", "ebay", "uber", "lyft", "airbnb", "linkedin", "stripe",
    "block", "snap", "pinterest", "reddit", "doordash", "instacart",
    "coinbase", "robinhood", "expedia", "booking", "yelp", "zillow",
    // Infrastructure and SaaS
    "databricks", "snowflake", "palantir", "splunk", "workday", "servicenow",
    "atlassian", "twilio", "datadog", "mongodb", "elastic", "hubspot",
    "zoom", "docusign", "okta", "cloudflare", "dropbox", "intuit",
    "openai", "anthropic",
    // Finance
    "bloomberg", "goldman sachs", "jpmorgan", "jpmorgan chase",
    "morgan stanley", "citigroup", "citi", "bank of america", "wells fargo",
    "capital one", "american express", "blackrock", "fidelity", "two sigma",
    "citadel", "jane street", "d e shaw", "visa", "mastercard",
    // IT services and consulting
    "infosys", "tata consultancy", "wipro", "cognizant", "hcl",
    "tech mahindra", "ltimindtree", "mindtree", "mphasis", "capgemini",
    "accenture", "deloitte", "ernst young", "pricewaterhousecoopers", "kpmg",
    "mckinsey", "boston consulting", "bain",
    // Everything else
    "walmart", "target", "costco", "tesla", "rivian", "boeing",
    "lockheed martin", "general motors", "ford", "johnson johnson", "pfizer",
    "merck", "moderna", "unitedhealth", "optum", "samsung", "sony", "siemens",
    "sap", "philips", "ericsson", "nokia",
  ]
    .map(normalizeCompany)
    .filter(Boolean)
);

function isKnownSponsor(company: string) {
  const name = normalizeCompany(company);
  if (!name) return false;
  if (KNOWN_SPONSORS.has(name)) return true;
  // "Amazon Web Services" should match "amazon", but "Amazonia Foods" must not.
  return [...KNOWN_SPONSORS].some((sponsor) => name.startsWith(`${sponsor} `));
}

export function detectSponsorship(input: {
  company: string;
  text: string;
}): SponsorshipSignal {
  const text = input.text.toLowerCase().replace(/\s+/g, " ");

  if (text && BLOCKING.some((re) => re.test(text))) return "blocked";
  if (text && SPONSORING.some((re) => re.test(text))) return "sponsors";
  if (isKnownSponsor(input.company)) return "likely";
  return "unknown";
}

export function sponsorshipLabel(signal: SponsorshipSignal) {
  if (signal === "sponsors") return "Mentions sponsorship";
  if (signal === "likely") return "Past H-1B sponsor";
  if (signal === "blocked") return "Rules out sponsorship";
  return "";
}

/** Applies the user's choice. Unknown always survives, since most ads say nothing. */
export function passesSponsorshipFilter(
  signal: SponsorshipSignal,
  filter: string
) {
  if (filter === "hide-blocked") return signal !== "blocked";
  if (filter === "likely") return signal === "sponsors" || signal === "likely";
  return true;
}
