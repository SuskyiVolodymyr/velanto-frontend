import { useId } from "react";

/**
 * Guarantees a form control reaches the DOM identifiable.
 *
 * A control carrying neither an `id` nor a `name` is invisible to the browser's
 * autofill heuristics — Chrome warns "A form field element should have an id or
 * name attribute" — and unfillable by a password manager.
 *
 * Returns the id to render. `useId` rather than a random string because it is
 * stable across server and client render; a random id would mismatch on
 * hydration.
 *
 * It is only ever a FALLBACK, and deliberately yields to the caller in both
 * directions:
 *
 * - an explicit `id` always wins, so a `<label htmlFor>` pairing still binds;
 * - a `name` alone is identity enough, so nothing is generated. That matters:
 *   stamping an id on a named field could collide with a `htmlFor` elsewhere,
 *   and a real name is strictly better than a generated id anyway — the name is
 *   what autofill matches against.
 *
 * Lives here rather than in each primitive because the need is a property of
 * being a form control, not of any one of them.
 */
export function useFieldIdentity(
  id?: string,
  name?: string,
): string | undefined {
  const generated = useId();
  return id ?? (name ? undefined : generated);
}
