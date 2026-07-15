/**
 * Thin wrappers around the Sentry SDK for the two things this app reports
 * beyond automatic error capture: who the current user is, and unexpected API
 * request failures. Every function is a no-op when Sentry isn't initialised
 * (the SDK swallows calls when there's no DSN), so callers don't need to guard.
 */
import * as Sentry from "@sentry/nextjs";
import type { User } from "@/src/shared/types/user";

/** Where an API call was going, for request-failure breadcrumbs/context. */
export interface ApiErrorContext {
  method: string;
  path: string;
}

/**
 * Tie subsequent events to the signed-in account. Only id + username are sent —
 * deliberately NOT email or any other PII (see security-checklist.md). Pass
 * `null` on logout to detach.
 */
export function setSentryUser(
  user: Pick<User, "id" | "username"> | null,
): void {
  if (user) {
    Sentry.setUser({ id: user.id, username: user.username });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Only server-side (5xx) responses are "unexpected" from the client's point of
 * view. Routine 4xx — validation (422), auth (401/403), not-found (404), rate
 * limit (429) — are expected outcomes the app handles, so they stay as
 * breadcrumbs rather than becoming their own Sentry issues. The authoritative
 * root-cause tracking for server errors lives in the backend's Sentry.
 */
export function isUnexpectedApiStatus(status: number): boolean {
  return status >= 500;
}

/** Capture a non-2xx API response, but only when it's an unexpected 5xx. */
export function captureApiError(
  status: number,
  statusText: string,
  ctx: ApiErrorContext,
): void {
  if (!isUnexpectedApiStatus(status)) return;
  Sentry.captureException(
    new Error(`API ${status} ${statusText} on ${ctx.method} ${ctx.path}`),
    { tags: { kind: "api", status: String(status) }, extra: { ...ctx } },
  );
}

/** Capture a request that never reached the server (offline, DNS, CORS, timeout). */
export function captureNetworkError(
  error: unknown,
  ctx: ApiErrorContext,
): void {
  Sentry.captureException(error, {
    tags: { kind: "network" },
    extra: { ...ctx },
  });
}
