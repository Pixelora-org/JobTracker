/**
 * Client for calling the Python AI Service.
 * 
 * This module provides typed functions for interacting with the ai-service
 * endpoints. It handles request formatting, error handling, and response parsing.
 */

import type { 
  OutreachDraft, 
  OutreachTemplate,
  ContactProfile 
} from "@/lib/ai/outreach";
import type { SearchPlan, Application } from "@/lib/types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

/**
 * Make a request to the AI service with optional authentication.
 */
async function aiServiceRequest<T>(
  endpoint: string,
  options: RequestInit & { auth?: string }
): Promise<T> {
  const { auth, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };
  
  // Add authorization if provided
  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`;
  }
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail: string;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorText;
      } catch {
        errorDetail = errorText;
      }
      
      throw new AiServiceError(
        `AI service error: ${errorDetail}`,
        response.status,
        errorDetail
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new AiServiceError(
        `Cannot connect to AI service at ${AI_SERVICE_URL}. Is it running?`
      );
    }
    
    throw new AiServiceError(
      `AI service request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export interface DraftOutreachRequest {
  application: {
    company: string;
    role: string;
    track: string;
    status: string;
    location?: string | null;
    workMode?: string | null;
    dateApplied?: string | null;
    resumeVersion?: string | null;
    notes?: string | null;
  };
  contactProfile?: ContactProfile | null;
  contactName?: string | null;
  contactTitle?: string | null;
  about?: string | null;
  channel: "LinkedIn" | "Email";
  template: OutreachTemplate;
  applicantName: string;
}

/**
 * Generate a cold outreach draft (LinkedIn note + email).
 */
export async function draftOutreach(
  request: DraftOutreachRequest,
  options?: { auth?: string }
): Promise<OutreachDraft> {
  return aiServiceRequest<OutreachDraft>("/api/v1/outreach/draft", {
    method: "POST",
    body: JSON.stringify(request),
    auth: options?.auth,
  });
}

export interface GenerateSearchPlanRequest {
  company: string;
  role: string;
  track: string;
  location?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
}

/**
 * Generate a contact search plan.
 */
export async function generateSearchPlan(
  request: GenerateSearchPlanRequest,
  options?: { auth?: string }
): Promise<SearchPlan> {
  return aiServiceRequest<SearchPlan>("/api/v1/search-plan/generate", {
    method: "POST",
    body: JSON.stringify(request),
    auth: options?.auth,
  });
}

/**
 * Check if the AI service is healthy and configured.
 */
export async function checkAiServiceHealth(): Promise<{
  status: string;
  version: string;
  ai_configured: boolean;
}> {
  return aiServiceRequest("/health", {
    method: "GET",
  });
}
