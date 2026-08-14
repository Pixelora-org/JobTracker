import {
  resolveDatePosted,
  resolveEmployment,
  resolveExperience,
  resolveSalaryMin,
  resolveSortBy,
  type JobFilters,
} from "@/lib/jobs/filters";
import { detectSponsorship, type SponsorshipSignal } from "@/lib/jobs/sponsorship";

export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
  remote: boolean;
  sponsorship: SponsorshipSignal;
  postedAt: string | null;
  salary: string | null;
  employment: string | null;
};

export type JobSearchInput = {
  query: string;
  location: string;
  country: string;
  remote: boolean;
  filters: JobFilters;
};

export function isJobsApiConfigured() {
  return Boolean(
    (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) ||
      process.env.RAPIDAPI_KEY ||
      process.env.JSEARCH_API_KEY
  );
}

const ADZUNA_COUNTRIES = new Set([
  "at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb",
  "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za",
]);

const CURRENCY: Record<string, string> = {
  us: "$", ca: "C$", gb: "£", in: "₹", au: "A$", nz: "NZ$", sg: "S$",
  za: "R", br: "R$", mx: "MX$", ch: "CHF ",
};

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

function formatSalary(
  min: number | undefined,
  max: number | undefined,
  predicted: boolean,
  country: string
) {
  if (!min && !max) return null;
  const symbol = CURRENCY[country] ?? "";
  const short = (n: number) =>
    n >= 1000 ? `${symbol}${Math.round(n / 1000)}k` : `${symbol}${n}`;
  const range =
    min && max && Math.round(min) !== Math.round(max)
      ? `${short(min)}–${short(max)}`
      : short(min || max || 0);
  return predicted ? `${range} est.` : range;
}

/** Adzuna has no experience or internship filter, so those fold into keywords. */
function buildAdzunaQuery(query: string, filters: JobFilters) {
  const level = resolveExperience(filters.experience);
  const employment = resolveEmployment(filters.employment);
  const parts = [level.add, query];
  if (employment.value === "internship" && !/intern/i.test(query)) {
    parts.push("intern");
  }
  return parts.filter(Boolean).join(" ").trim();
}

async function searchAdzuna(input: JobSearchInput) {
  const { filters } = input;
  const appId = process.env.ADZUNA_APP_ID ?? "";
  const appKey = process.env.ADZUNA_APP_KEY ?? "";
  const cc = adzunaCountry(input.country);

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "20",
    what: buildAdzunaQuery(input.query, filters),
  });

  const where = adzunaWhere(input.location);
  if (where) params.set("where", where);

  const level = resolveExperience(filters.experience);
  if (level.exclude) params.set("what_exclude", level.exclude);

  const employment = resolveEmployment(filters.employment);
  if (employment.adzuna) params.set(employment.adzuna, "1");

  const posted = resolveDatePosted(filters.datePosted);
  if (posted.days) params.set("max_days_old", String(posted.days));

  const salary = resolveSalaryMin(filters.salaryMin);
  if (salary.amount) params.set("salary_min", String(salary.amount));

  const sort = resolveSortBy(filters.sortBy);
  params.set("sort_by", sort.value);

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
      created?: string;
      salary_min?: number;
      salary_max?: number;
      salary_is_predicted?: string;
      contract_time?: string;
      contract_type?: string;
    }>;
  };

  return (json.results ?? []).map((row, i) => {
    const company = row.company?.display_name ?? "Company";
    const description = row.description ?? "";
    return {
      id: String(row.id ?? `adzuna-${i}`),
      title: row.title ?? "Role",
      company,
      location: row.location?.display_name ?? "",
      url: row.redirect_url ?? "",
      snippet: snippet(description),
      remote: /remote/i.test(`${row.title} ${row.location?.display_name}`),
      sponsorship: detectSponsorship({
        company,
        text: `${row.title ?? ""} ${description}`,
      }),
      postedAt: row.created ?? null,
      salary: formatSalary(
        row.salary_min,
        row.salary_max,
        row.salary_is_predicted === "1",
        cc
      ),
      employment: row.contract_time?.replace("_", " ") ?? row.contract_type ?? null,
    };
  });
}

async function searchJSearch(input: JobSearchInput) {
  const { filters } = input;
  const key = process.env.JSEARCH_API_KEY ?? process.env.RAPIDAPI_KEY ?? "";
  const level = resolveExperience(filters.experience);
  const employment = resolveEmployment(filters.employment);
  const posted = resolveDatePosted(filters.datePosted);

  const q = [level.add, input.query, input.location.trim() ? `in ${input.location}` : ""]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    query: q,
    page: "1",
    num_pages: "1",
    date_posted: posted.jsearch,
  });
  if (input.remote) params.set("work_from_home", "true");
  if (employment.jsearch) params.set("employment_types", employment.jsearch);
  if (level.jsearch) params.set("job_requirements", level.jsearch);

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
      job_posted_at_datetime_utc?: string;
      job_employment_type?: string;
      job_highlights?: { Qualifications?: string[] };
    }>;
  };

  return (json.data ?? []).map((row, i) => {
    const company = row.employer_name ?? "Company";
    const description = row.job_description ?? "";
    const qualifications = (row.job_highlights?.Qualifications ?? []).join(" ");
    return {
      id: row.job_id ?? `jsearch-${i}`,
      title: row.job_title ?? "Role",
      company,
      location: [row.job_city, row.job_state, row.job_country]
        .filter(Boolean)
        .join(", "),
      url: row.job_apply_link ?? "",
      snippet: snippet(description),
      remote: Boolean(row.job_is_remote),
      sponsorship: detectSponsorship({
        company,
        text: `${row.job_title ?? ""} ${description} ${qualifications}`,
      }),
      postedAt: row.job_posted_at_datetime_utc ?? null,
      salary: null,
      employment: row.job_employment_type?.toLowerCase() ?? null,
    };
  });
}

export async function searchJobListings(
  input: JobSearchInput
): Promise<JobListing[]> {
  if (!input.query.trim()) return [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    return searchAdzuna(input);
  }
  if (process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY) {
    return searchJSearch(input);
  }
  throw new Error(
    "Job search is off. Add ADZUNA_APP_ID and ADZUNA_APP_KEY, or RAPIDAPI_KEY, in .env.local."
  );
}
