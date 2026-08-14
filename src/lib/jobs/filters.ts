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
