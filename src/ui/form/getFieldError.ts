import type { FieldErrors } from "react-hook-form";

/**
 * Reads a field's error message out of react-hook-form's (possibly nested)
 * `formState.errors`, given a dotted `name` like `"email"` or
 * `"categories.0.name"`. Returns `undefined` when there's no message.
 */
export function getFieldError(
  errors: FieldErrors,
  name: string,
): string | undefined {
  let current: unknown = errors;
  for (const part of name.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  const message = (current as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}
