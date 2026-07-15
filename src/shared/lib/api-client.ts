/**
 * Small typed fetch wrapper. All data fetching in this repo should go
 * through here (see coding-conventions.md) rather than calling `fetch`
 * directly from components/pages.
 */

import {
  captureApiError,
  captureNetworkError,
} from "@/src/shared/lib/sentry-reporting";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Held in memory only (never localStorage) — see .claude/docs/security-checklist.md.
// Set by AuthProvider after login/register/refresh; cleared on logout.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API request failed: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const method = rest.method ?? "GET";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      // Required so the httpOnly refresh-token cookie is sent/received on
      // cross-origin requests to the backend.
      credentials: "include",
      headers: {
        // Fastify's JSON body parser rejects a request that declares
        // application/json but sends no body (FST_ERR_CTP_EMPTY_JSON_BODY) —
        // only set this header when there's actually a body to send.
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    // fetch rejects only when the request never got a response (offline, DNS,
    // CORS, timeout) — always unexpected, so report it.
    captureNetworkError(networkError, { method, path });
    throw networkError;
  }

  if (!response.ok) {
    let parsedBody: unknown = null;
    try {
      parsedBody = await response.json();
    } catch {
      // response had no JSON body — leave parsedBody as null
    }
    // Only 5xx is reported; routine 4xx are expected and skipped inside.
    captureApiError(response.status, response.statusText, { method, path });
    throw new ApiError(response.status, response.statusText, parsedBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Multipart POST for file uploads (e.g. media). Deliberately does NOT set a
 * Content-Type header — the browser sets `multipart/form-data` with the boundary
 * itself. Auth/credentials are attached exactly like {@link request}.
 */
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });
  } catch (networkError) {
    captureNetworkError(networkError, { method: "POST", path });
    throw networkError;
  }

  if (!response.ok) {
    let parsedBody: unknown = null;
    try {
      parsedBody = await response.json();
    } catch {
      // response had no JSON body — leave parsedBody as null
    }
    captureApiError(response.status, response.statusText, {
      method: "POST",
      path,
    });
    throw new ApiError(response.status, response.statusText, parsedBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  postForm: <T>(path: string, formData: FormData) =>
    requestForm<T>(path, formData),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
