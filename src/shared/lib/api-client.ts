/**
 * Small typed fetch wrapper. All data fetching in this repo should go
 * through here (see coding-conventions.md) rather than calling `fetch`
 * directly from components/pages.
 */

import {
  captureApiError,
  captureNetworkError,
} from "@/src/shared/lib/sentry-reporting";
import type { User } from "@/src/shared/types/user";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Held in memory only (never localStorage) — see .claude/docs/security-checklist.md.
// Set by AuthProvider after login/register/refresh; cleared on logout.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Shape of POST /auth/refresh — a fresh access token plus the current user.
interface RefreshResult {
  accessToken: string;
  user: User;
}

/**
 * AuthProvider registers these so a *silent* refresh (below) keeps React auth
 * state in sync: `onRefreshed` updates the cached user after a transparent
 * token renewal; `onLost` drops the session to unauthenticated when the refresh
 * cookie is gone (expired/revoked). Pass `null` to clear (used by tests).
 */
interface SessionCallbacks {
  onRefreshed: (user: User) => void;
  onLost: () => void;
}

let sessionCallbacks: SessionCallbacks | null = null;

export function setSessionCallbacks(callbacks: SessionCallbacks | null): void {
  sessionCallbacks = callbacks;
}

// Access tokens expire (24h). Rather than surface that to the user as a wall of
// 401s until they reload, a single request transparently renews the token and
// retries. Concurrent 401s (e.g. the notification poller firing alongside a
// page load) must not each hit /auth/refresh, so the in-flight refresh is
// shared: the first 401 starts it, the rest await the same promise.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`refresh failed: ${response.status}`);
      const { accessToken: fresh, user } =
        (await response.json()) as RefreshResult;
      accessToken = fresh;
      sessionCallbacks?.onRefreshed(user);
      return fresh;
    } catch {
      // Refresh cookie is gone (expired/revoked) — the session is truly over.
      accessToken = null;
      sessionCallbacks?.onLost();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// The refresh endpoint itself must never trigger a nested refresh-retry (it
// would recurse). Every other 401 is treated as a possibly-expired token —
// but only when we actually sent one (see the `hadToken` guard at the call
// site), so an anonymous request's 401 stays a plain 401.
function isRefreshEndpoint(path: string): boolean {
  return path === "/auth/refresh";
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

/**
 * Sends `${API_BASE_URL}${path}` and, on a 401 that carried an access token,
 * transparently refreshes it once and retries. `buildInit` is a factory (not a
 * value) so the retry rebuilds the request with the freshly-minted token.
 */
async function sendWithRefresh(
  path: string,
  buildInit: () => RequestInit,
): Promise<Response> {
  // Whether *this* request was authenticated. An anonymous request's 401 is
  // expected, so don't burn a refresh round-trip on it.
  const hadToken = accessToken !== null;
  const response = await fetch(`${API_BASE_URL}${path}`, buildInit());

  if (response.status !== 401 || !hadToken || isRefreshEndpoint(path)) {
    return response;
  }

  const fresh = await refreshAccessToken();
  if (!fresh) return response; // refresh failed — the original 401 stands
  return fetch(`${API_BASE_URL}${path}`, buildInit());
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const method = rest.method ?? "GET";

  // Rebuilt per attempt so the post-refresh retry picks up the new token.
  const buildInit = (): RequestInit => ({
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

  let response: Response;
  try {
    response = await sendWithRefresh(path, buildInit);
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
  const buildInit = (): RequestInit => ({
    method: "POST",
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  let response: Response;
  try {
    response = await sendWithRefresh(path, buildInit);
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
