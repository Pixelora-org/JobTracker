export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
  remote: boolean;
};

export function isJobsApiConfigured() {
  return Boolean(
    (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) ||
      process.env.RAPIDAPI_KEY ||
      process.env.JSEARCH_API_KEY
  );
}

const ADZUNA_COUNTRIES = new Set([
  "at",
  "au",
  "be",
  "br",
  "ca",
  "ch",
  "de",
  "es",
  "fr",
  "gb",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "sg",
  "us",
  "za",
]);

function snippet(text: string) {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.slice(0, 220);
}

function adzunaCountry(country: string) {
  const raw = country.trim().toLowerCase();
  if (raw === "uk" || raw === "united kingdom") return "gb";
  const cc = raw.slice(0, 2);
  return ADZUNA_COUNTRIES.has(cc) ? cc : "us";
}

function adzunaWhere(location: string) {
  const where = location.trim();
  if (!where) return "";
  if (/^(remote|anywhere|worldwide|n\/?a)$/i.test(where)) return "";
  return where;
}

async function searchAdzuna(query: string, location: string, country: string) {
  const appId = process.env.ADZUNA_APP_ID ?? "";
  const appKey = process.env.ADZUNA_APP_KEY ?? "";
  const cc = adzunaCountry(country);
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "12",
    what: query,
  });
  const where = adzunaWhere(location);
  if (where) params.set("where", where);

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?${params}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    const body = await res.text();
    let detail = "";
    try {
      const parsed = JSON.parse(body) as { display?: string; exception?: string };
      detail = parsed.display || parsed.exception || "";
    } catch {
      detail = "";
    }
    throw new Error(
      detail
        ? `Job search failed (${res.status}): ${detail}`
        : `Job search failed (${res.status}). Try a simpler title or city.`
    );
  }
  const json = (await res.json()) as {
    results?: Array<{
      id?: string | number;
      title?: string;
      company?: { display_name?: string };
      location?: { display_name?: string };
      redirect_url?: string;
      description?: string;
    }>;
  };
  return (json.results ?? []).map((row, i) => ({
    id: String(row.id ?? `adzuna-${i}`),
    title: row.title ?? "Role",
    company: row.company?.display_name ?? "Company",
    location: row.location?.display_name ?? "",
    url: row.redirect_url ?? "",
    snippet: snippet(row.description ?? ""),
    remote: /remote/i.test(`${row.title} ${row.location?.display_name}`),
  }));
}

async function searchJSearch(query: string, location: string) {
  const key = process.env.JSEARCH_API_KEY ?? process.env.RAPIDAPI_KEY ?? "";
  const q = location.trim() ? `${query} in ${location}` : query;
  const params = new URLSearchParams({
    query: q,
    page: "1",
    num_pages: "1",
  });
  const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
    cache: "no-store",
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  if (!res.ok) {
    throw new Error(`Job search failed (${res.status}). Check RAPIDAPI_KEY.`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      job_id?: string;
      job_title?: string;
      employer_name?: string;
      job_city?: string;
      job_state?: string;
      job_country?: string;
      job_apply_link?: string;
      job_description?: string;
      job_is_remote?: boolean;
    }>;
  };
  return (json.data ?? []).map((row, i) => ({
    id: row.job_id ?? `jsearch-${i}`,
    title: row.job_title ?? "Role",
    company: row.employer_name ?? "Company",
    location: [row.job_city, row.job_state, row.job_country]
      .filter(Boolean)
      .join(", "),
    url: row.job_apply_link ?? "",
    snippet: snippet(row.job_description ?? ""),
    remote: Boolean(row.job_is_remote),
  }));
}

export async function searchJobListings(input: {
  query: string;
  location: string;
  country: string;
}): Promise<JobListing[]> {
  if (!input.query.trim()) return [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    return searchAdzuna(input.query, input.location, input.country);
  }
  if (process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY) {
    return searchJSearch(input.query, input.location);
  }
  throw new Error(
    "Job search is off. Add ADZUNA_APP_ID and ADZUNA_APP_KEY, or RAPIDAPI_KEY, in .env.local."
  );
}
