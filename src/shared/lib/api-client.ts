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
// The token's `exp`, in ms, decoded when the token is assigned — so we can renew
// it *before* sending rather than only reacting to a 401 (see sendWithRefresh).
let accessTokenExpMs: number | null = null;

function assignAccessToken(token: string | null): void {
  accessToken = token;
  accessTokenExpMs = token ? decodeJwtExpMs(token) : null;
}

export function setAccessToken(token: string | null): void {
  assignAccessToken(token);
}

/** Read a JWT's `exp` (ms) without verifying it; null for an opaque/bad token. */
function decodeJwtExpMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const claims = JSON.parse(atob(b64)) as { exp?: number };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null; // not a JWT we can read — proactive refresh simply won't apply
  }
}

// A few seconds of slack so a token expiring mid-flight is renewed too.
const TOKEN_STALE_SKEW_MS = 10_000;

function accessTokenIsStale(): boolean {
  return (
    accessTokenExpMs !== null &&
    Date.now() >= accessTokenExpMs - TOKEN_STALE_SKEW_MS
  );
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

/** The outcome of one refresh attempt. */
export interface RefreshOutcome {
  /** The renewed token + user, or null when the refresh didn't succeed. */
  result: RefreshResult | null;
  /** True ONLY when the server definitively ended the session (a 401). */
  sessionEnded: boolean;
}

// Access tokens expire (24h). Rather than surface that to the user as a wall of
// 401s until they reload, a single request transparently renews the token and
// retries. Concurrent refreshes must not each hit /auth/refresh: rotation is
// single-use server-side, so two parallel calls carrying the same cookie make
// one of them lose the race. Everything therefore funnels through this one
// in-flight promise — the first caller starts it, the rest await it.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

function runRefresh(): Promise<RefreshOutcome> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const result = (await response.json()) as RefreshResult;
        assignAccessToken(result.accessToken);
        sessionCallbacks?.onRefreshed(result.user);
        return { result, sessionEnded: false };
      }
      // ONLY a 401 proves the refresh cookie is gone (expired/revoked) — that
      // is the single case where the session is genuinely over. Anything else
      // (a 429 from the refresh throttle, a 5xx, a backend restart mid-deploy)
      // is transient, and ending the session there logged EVERY active user out
      // during an outage. Leave it intact; the next request retries naturally.
      if (response.status === 401) {
        assignAccessToken(null);
        sessionCallbacks?.onLost();
        return { result: null, sessionEnded: true };
      }
      return { result: null, sessionEnded: false };
    } catch {
      // Network blip — transient, same reasoning as above. Keep the session.
      return { result: null, sessionEnded: false };
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function refreshAccessToken(): Promise<string | null> {
  return runRefresh().then(({ result }) => result?.accessToken ?? null);
}

/**
 * Single-flight session refresh, shared with AuthProvider.
 *
 * EVERYTHING that refreshes must go through this. AuthProvider used to call
 * POST /auth/refresh directly (on mount, and in revalidate), bypassing the
 * mutex above — so a mount-time bootstrap could run in parallel with a
 * 401-triggered renewal, both presenting the same cookie, and whichever lost
 * the server's single-use rotation got a 401 and logged the user out.
 */
export function refreshSession(): Promise<RefreshOutcome> {
  return runRefresh();
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
  // Optional-auth endpoints (e.g. POST /packs/:id/plays) accept an expired token
  // as "anonymous" and answer 200, so the reactive 401-refresh below never fires
  // and the request silently loses its identity — a signed-in play would be
  // recorded anonymously and vanish from the player's history. Pre-empt that: if
  // the token is visibly expired, renew it before sending. buildInit reads the
  // token at call time, so it picks up the fresh one; a failed refresh nulls the
  // token and the request just proceeds anonymously (graceful, no error).
  if (
    accessToken !== null &&
    !isRefreshEndpoint(path) &&
    accessTokenIsStale()
  ) {
    await refreshAccessToken();
  }

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
