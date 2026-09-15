import { auth } from "@clerk/nextjs/server";
import type { Contact } from "@/lib/types";

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
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Backend DTO types (camelCase JSON from Java Spring Boot)
 */
export type ContactResponse = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  company: string;
  title: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type ContactCreateRequest = {
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  company: string;
  title?: string | null;
};

export type ContactUpdateRequest = {
  name?: string;
  email?: string | null;
  linkedinUrl?: string | null;
  company?: string;
  title?: string | null;
};

/**
 * Convert backend response to frontend Contact type.
 */
function toContact(response: ContactResponse): Contact {
  return {
    id: response.id,
    userId: response.userId,
    name: response.name,
    email: response.email,
    linkedinUrl: response.linkedinUrl,
    company: response.company,
    title: response.title,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

/**
 * List all contacts for the authenticated user.
 */
export async function apiListContacts(): Promise<Contact[]> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await handleResponse<ContactResponse[]>(response);
  return data.map(toContact);
}

/**
 * Get a single contact by ID.
 */
export async function apiGetContact(id: string): Promise<Contact> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await handleResponse<ContactResponse>(response);
  return toContact(data);
}

/**
 * Create a new contact.
 */
export async function apiCreateContact(
  input: ContactCreateRequest
): Promise<Contact> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<ContactResponse>(response);
  return toContact(data);
}

/**
 * Find or create a contact by email.
 */
export async function apiFindOrCreateContact(
  input: ContactCreateRequest
): Promise<Contact> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts/find-or-create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<ContactResponse>(response);
  return toContact(data);
}

/**
 * Update an existing contact.
 */
export async function apiUpdateContact(
  id: string,
  input: ContactUpdateRequest
): Promise<Contact> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<ContactResponse>(response);
  return toContact(data);
}

/**
 * Delete a contact.
 */
export async function apiDeleteContact(id: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    await handleResponse(response);
  }
}
