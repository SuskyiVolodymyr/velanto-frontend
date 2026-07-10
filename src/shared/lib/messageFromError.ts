import { ApiError } from "@/src/shared/lib/api-client";

const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

export interface MessageFromErrorOptions {
  /** Message returned when nothing more specific applies. */
  fallback?: string;
  /**
   * Per-status copy used when an {@link ApiError} carries no usable body
   * message — e.g. `{ 401: "Invalid credentials." }`. Kept caller-supplied so
   * shared unwrap logic doesn't bake one form's copy into another's.
   */
  statusFallbacks?: Record<number, string>;
}

/**
 * Turns an unknown thrown value into a user-facing string.
 *
 * Handles both backend error shapes:
 *
 * - **nestjs-zod validation failures** (the global `ZodValidationPipe`): the
 *   body is `{ statusCode, message: "Validation failed", errors: [...zod
 *   issues] }`. The useful, field-level copy lives in `errors[].message`; the
 *   top-level `message` is always the generic "Validation failed". We surface
 *   the first field issue so specific validation copy — e.g. the moderation
 *   rejection — reaches the user instead of the useless generic string.
 * - **business/HTTP errors** (Nest's `HttpException`): `{ message: string |
 *   string[] }`. We surface the string (or the first array entry).
 *
 * This stays fully generic — no message string is special-cased. It's the
 * single copy the forms (auth / create-pack / new-feedback / comments /
 * profile) rely on; AuthForm passes `statusFallbacks: { 401: "Invalid
 * credentials." }`.
 */
export function messageFromError(
  error: unknown,
  options: MessageFromErrorOptions = {},
): string {
  const { fallback = DEFAULT_FALLBACK, statusFallbacks } = options;

  if (error instanceof ApiError) {
    const body = error.body as {
      message?: string | string[];
      errors?: unknown;
    } | null;

    // Prefer a field-level zod issue message (nestjs-zod validation shape)
    // over the generic top-level "Validation failed".
    const fieldMessage = firstIssueMessage(body?.errors);
    if (fieldMessage) {
      return fieldMessage;
    }

    const raw = body?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (statusFallbacks && error.status in statusFallbacks) {
      return statusFallbacks[error.status];
    }
  }

  return fallback;
}

/**
 * From a nestjs-zod `errors` array (each entry a zod issue with a `message`),
 * return the first usable message string, or `undefined` when the value isn't
 * a non-empty array of issues carrying a message.
 */
function firstIssueMessage(errors: unknown): string | undefined {
  if (!Array.isArray(errors)) return undefined;
  for (const issue of errors) {
    const message = (issue as { message?: unknown } | null)?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return undefined;
}
