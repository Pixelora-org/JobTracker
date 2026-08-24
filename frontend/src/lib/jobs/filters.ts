export const JOB_SEARCH_TYPES = [
  { group: "Intern", value: "software engineer intern", label: "Software engineer intern" },
  { group: "Intern", value: "security intern", label: "Security intern" },
  { group: "Intern", value: "data intern", label: "Data intern" },
  { group: "Intern", value: "product intern", label: "Product intern" },
  { group: "Intern", value: "IT intern", label: "IT intern" },
  { group: "Software", value: "software engineer", label: "Software engineer" },
  { group: "Software", value: "new grad software engineer", label: "New grad software engineer" },
  { group: "Software", value: "frontend engineer", label: "Frontend engineer" },
  { group: "Software", value: "backend engineer", label: "Backend engineer" },
  { group: "Software", value: "full stack engineer", label: "Full stack engineer" },
  { group: "Security", value: "security engineer", label: "Security engineer" },
  { group: "Security", value: "cybersecurity analyst", label: "Cybersecurity analyst" },
  { group: "Security", value: "SOC analyst", label: "SOC analyst" },
  { group: "Other", value: "data analyst", label: "Data analyst" },
  { group: "Other", value: "product manager", label: "Product manager" },
  { group: "Other", value: "IT support", label: "IT support" },
] as const;

export const JOB_SEARCH_LOCATIONS = [
  { group: "Anywhere", value: "", label: "Anywhere (US)", country: "us" },
  { group: "Anywhere", value: "remote", label: "Remote", country: "us" },
  { group: "United States", value: "New York, NY", label: "New York, NY", country: "us" },
  { group: "United States", value: "San Francisco, CA", label: "San Francisco, CA", country: "us" },
  { group: "United States", value: "San Jose, CA", label: "San Jose, CA", country: "us" },
  { group: "United States", value: "Seattle, WA", label: "Seattle, WA", country: "us" },
  { group: "United States", value: "Austin, TX", label: "Austin, TX", country: "us" },
  { group: "United States", value: "Boston, MA", label: "Boston, MA", country: "us" },
  { group: "United States", value: "Chicago, IL", label: "Chicago, IL", country: "us" },
  { group: "United States", value: "Los Angeles, CA", label: "Los Angeles, CA", country: "us" },
  { group: "United States", value: "Washington, DC", label: "Washington, DC", country: "us" },
  { group: "United States", value: "Denver, CO", label: "Denver, CO", country: "us" },
  { group: "United States", value: "Atlanta, GA", label: "Atlanta, GA", country: "us" },
  { group: "United States", value: "Dallas, TX", label: "Dallas, TX", country: "us" },
  { group: "United States", value: "Raleigh, NC", label: "Raleigh, NC", country: "us" },
  { group: "Canada", value: "Toronto", label: "Toronto, ON", country: "ca" },
  { group: "Canada", value: "Vancouver", label: "Vancouver, BC", country: "ca" },
  { group: "Canada", value: "Waterloo", label: "Waterloo, ON", country: "ca" },
  { group: "United Kingdom", value: "London", label: "London", country: "gb" },
  { group: "India", value: "Bengaluru", label: "Bengaluru", country: "in" },
  { group: "India", value: "Hyderabad", label: "Hyderabad", country: "in" },
  { group: "India", value: "Mumbai", label: "Mumbai", country: "in" },
  { group: "India", value: "Delhi", label: "Delhi", country: "in" },
  { group: "India", value: "Pune", label: "Pune", country: "in" },
  { group: "Other", value: "Singapore", label: "Singapore", country: "sg" },
  { group: "Other", value: "Sydney", label: "Sydney", country: "au" },
] as const;

/**
 * Neither Adzuna nor JSearch has an experience-level filter, so each level
 * carries the pieces we can push down: words to add to the query, words to
 * exclude, and JSearch's own job_requirements codes.
 */
export const EXPERIENCE_LEVELS = [
  { value: "", label: "Any experience", add: "", exclude: "", jsearch: "" },
  {
    value: "intern",
    label: "Internship",
    add: "intern",
    exclude: "senior staff principal director manager",
    jsearch: "no_experience",
  },
  {
    value: "entry",
    label: "Entry level / new grad",
    add: "",
    exclude: "senior staff principal lead director manager architect",
    jsearch: "no_experience,under_3_years_experience",
  },
  {
    value: "mid",
    label: "Mid level (2-5 years)",
    add: "",
    exclude: "intern internship principal director vp",
    jsearch: "under_3_years_experience",
  },
  {
    value: "senior",
    label: "Senior (5+ years)",
    add: "senior",
    exclude: "intern internship junior graduate",
    jsearch: "more_than_3_years_experience",
  },
] as const;

export const EMPLOYMENT_TYPES = [
  { value: "", label: "Any type", adzuna: "", jsearch: "" },
  { value: "full_time", label: "Full-time", adzuna: "full_time", jsearch: "FULLTIME" },
  { value: "part_time", label: "Part-time", adzuna: "part_time", jsearch: "PARTTIME" },
  { value: "contract", label: "Contract", adzuna: "contract", jsearch: "CONTRACTOR" },
  { value: "internship", label: "Internship", adzuna: "", jsearch: "INTERN" },
] as const;

export const DATE_POSTED = [
  { value: "", label: "Any time", days: 0, jsearch: "all" },
  { value: "today", label: "Past 24 hours", days: 1, jsearch: "today" },
  { value: "3days", label: "Past 3 days", days: 3, jsearch: "3days" },
  { value: "week", label: "Past week", days: 7, jsearch: "week" },
  { value: "month", label: "Past month", days: 30, jsearch: "month" },
] as const;

/** Annual, in the country's own currency. Adzuna drops unpriced ads when set. */
export const SALARY_MINIMUMS = [
  { value: "", label: "Any salary", amount: 0 },
  { value: "50000", label: "50k+", amount: 50_000 },
  { value: "75000", label: "75k+", amount: 75_000 },
  { value: "100000", label: "100k+", amount: 100_000 },
  { value: "125000", label: "125k+", amount: 125_000 },
  { value: "150000", label: "150k+", amount: 150_000 },
  { value: "200000", label: "200k+", amount: 200_000 },
] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "date", label: "Newest first" },
  { value: "salary", label: "Highest salary" },
] as const;

/** No jobs API exposes visa status, so this is applied to results, not the query. */
export const SPONSORSHIP_FILTERS = [
  { value: "", label: "Any" },
  { value: "hide-blocked", label: "Hide posts that rule it out" },
  { value: "likely", label: "Likely sponsors only" },
] as const;

export type JobFilters = {
  experience: string;
  employment: string;
  datePosted: string;
  salaryMin: string;
  sortBy: string;
  sponsorship: string;
};

export const DEFAULT_JOB_FILTERS: JobFilters = {
  experience: "",
  employment: "",
  datePosted: "",
  salaryMin: "",
  sortBy: "relevance",
  sponsorship: "",
};

type JobSearchLocation = (typeof JOB_SEARCH_LOCATIONS)[number];

export function jobTypeGroups() {
  return [...new Set(JOB_SEARCH_TYPES.map((row) => row.group))];
}

export function locationGroups() {
  return [...new Set(JOB_SEARCH_LOCATIONS.map((row) => row.group))];
}

export function resolveJobLocation(value: string): JobSearchLocation {
  return (
    JOB_SEARCH_LOCATIONS.find((row) => row.value === value) ??
    JOB_SEARCH_LOCATIONS[0]
  );
}

export function resolveExperience(value: string) {
  return (
    EXPERIENCE_LEVELS.find((row) => row.value === value) ?? EXPERIENCE_LEVELS[0]
  );
}

export function resolveEmployment(value: string) {
  return (
    EMPLOYMENT_TYPES.find((row) => row.value === value) ?? EMPLOYMENT_TYPES[0]
  );
}

export function resolveDatePosted(value: string) {
  return DATE_POSTED.find((row) => row.value === value) ?? DATE_POSTED[0];
}

export function resolveSalaryMin(value: string) {
  return (
    SALARY_MINIMUMS.find((row) => row.value === value) ?? SALARY_MINIMUMS[0]
  );
}

export function resolveSortBy(value: string) {
  return SORT_OPTIONS.find((row) => row.value === value) ?? SORT_OPTIONS[0];
}
