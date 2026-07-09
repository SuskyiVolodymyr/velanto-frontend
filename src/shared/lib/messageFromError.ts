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
 * Unwraps the `{ message: string | string[] }` shape the backend returns for
 * validation/business errors (Nest sends an array for field-level failures;
 * we surface the first). This is the single copy all three forms
 * (auth / create-pack / new-feedback) rely on; AuthForm passes
 * `statusFallbacks: { 401: "Invalid credentials." }`.
 */
export function messageFromError(
  error: unknown,
  options: MessageFromErrorOptions = {},
): string {
  const { fallback = DEFAULT_FALLBACK, statusFallbacks } = options;

  if (error instanceof ApiError) {
    const raw = (error.body as { message?: string | string[] } | null)?.message;
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
