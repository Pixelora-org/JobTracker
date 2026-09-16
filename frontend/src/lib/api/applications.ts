import { auth } from "@clerk/nextjs/server";
import type {
  Application,
  ApplicationInput,
  SearchPlan,
  Status,
  Track,
  Source,
  WorkMode,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Get the Clerk session token for API authentication.
 */
async function getAuthToken(): Promise<string> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    throw new Error("Unauthorized: No session token available");
  }
  return token;
}

/**
 * Handle API response errors.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If response is not JSON, use the text as error message
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Backend DTO types (camelCase JSON from Java Spring Boot)
 */
type ApplicationResponse = {
  id: string;
  userId: string;
  company: string;
  role: string;
  jobUrl: string | null;
  track: string;
  resumeVersion: string | null;
  status: string;
  source: string;
  location: string | null;
  workMode: string | null;
  dateApplied: string | null; // ISO 8601
  nextActionDate: string | null; // ISO 8601
  notes: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

type ApplicationCreateRequest = {
  company: string;
  role: string;
  jobUrl?: string | null;
  track: string;
  resumeVersion?: string | null;
  status: string;
  source: string;
  location?: string | null;
  workMode?: string | null;
  dateApplied?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
};

type ApplicationUpdateRequest = {
  company?: string;
  role?: string;
  jobUrl?: string | null;
  track?: string;
  resumeVersion?: string | null;
  status?: string;
  source?: string;
  location?: string | null;
  workMode?: string | null;
  dateApplied?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
};

/**
 * Convert backend response to frontend Application type.
 * Note: searchPlan is NOT in the backend; it's managed separately.
 */
function toApplication(dto: ApplicationResponse): Application {
  return {
    id: dto.id,
    userId: dto.userId,
    company: dto.company,
    role: dto.role,
    jobUrl: dto.jobUrl,
    track: dto.track as Track,
    resumeVersion: dto.resumeVersion,
    status: dto.status as Status,
    source: dto.source as Source,
    location: dto.location,
    workMode: dto.workMode as WorkMode | null,
    dateApplied: dto.dateApplied,
    nextActionDate: dto.nextActionDate,
    notes: dto.notes,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    searchPlan: null, // Not in backend
  };
}

/**
 * Convert frontend input to backend create request.
 */
function toCreateRequest(input: ApplicationInput): ApplicationCreateRequest {
  return {
    company: input.company.trim(),
    role: input.role.trim(),
    jobUrl: input.jobUrl?.trim() || null,
    track: input.track,
    resumeVersion: input.resumeVersion?.trim() || null,
    status: input.status,
    source: input.source,
    location: input.location?.trim() || null,
    workMode: input.workMode || null,
    dateApplied: input.dateApplied || null,
    nextActionDate: input.nextActionDate || null,
    notes: input.notes?.trim() || null,
  };
}

/**
 * Convert frontend partial input to backend update request.
 */
function toUpdateRequest(input: Partial<ApplicationInput>): ApplicationUpdateRequest {
  const request: ApplicationUpdateRequest = {};
  if (input.company !== undefined) request.company = input.company.trim();
  if (input.role !== undefined) request.role = input.role.trim();
  if (input.jobUrl !== undefined) request.jobUrl = input.jobUrl?.trim() || null;
  if (input.track !== undefined) request.track = input.track;
  if (input.resumeVersion !== undefined)
    request.resumeVersion = input.resumeVersion?.trim() || null;
  if (input.status !== undefined) request.status = input.status;
  if (input.source !== undefined) request.source = input.source;
  if (input.location !== undefined) request.location = input.location?.trim() || null;
  if (input.workMode !== undefined) request.workMode = input.workMode || null;
  if (input.dateApplied !== undefined) request.dateApplied = input.dateApplied || null;
  if (input.nextActionDate !== undefined)
    request.nextActionDate = input.nextActionDate || null;
  if (input.notes !== undefined) request.notes = input.notes?.trim() || null;
  return request;
}

/**
 * List applications with optional filters.
 */
export async function apiListApplications(opts?: {
  search?: string;
  status?: string;
  track?: string;
  source?: string;
}): Promise<Application[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (opts?.status) params.append("status", opts.status);
  // Note: Backend only supports status filter currently.
  // track, source, and search are not implemented in backend yet.
  
  const url = `${API_URL}/api/v1/applications${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await handleResponse<ApplicationResponse[]>(response);
  let applications = data.map(toApplication);

  // Apply client-side filters for track, source, search (not in backend yet)
  if (opts?.track) {
    applications = applications.filter((app) => app.track === opts.track);
  }
  if (opts?.source) {
    applications = applications.filter((app) => app.source === opts.source);
  }
  if (opts?.search?.trim()) {
    const term = opts.search.trim().toLowerCase();
    applications = applications.filter(
      (app) =>
        app.company.toLowerCase().includes(term) ||
        app.role.toLowerCase().includes(term)
    );
  }

  return applications;
}

/**
 * Get a single application by ID.
 */
export async function apiGetApplication(id: string): Promise<Application | null> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/applications/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  const data = await handleResponse<ApplicationResponse>(response);
  return toApplication(data);
}

/**
 * Create a new application.
 */
export async function apiCreateApplication(
  input: ApplicationInput
): Promise<Application> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/applications`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toCreateRequest(input)),
  });

  const data = await handleResponse<ApplicationResponse>(response);
  return toApplication(data);
}

/**
 * Update an existing application.
 */
export async function apiUpdateApplication(
  id: string,
  input: Partial<ApplicationInput>
): Promise<Application> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/applications/${id}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toUpdateRequest(input)),
  });

  const data = await handleResponse<ApplicationResponse>(response);
  return toApplication(data);
}

/**
 * Delete an application.
 */
export async function apiDeleteApplication(id: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/applications/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (response.status !== 204) {
    await handleResponse<void>(response);
  }
}
