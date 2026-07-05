/**
 * Minimal className combiner. Filters falsy values and joins with a space.
 * Kept dependency-free (no clsx/tailwind-merge) since primitives here don't
 * yet have conflicting Tailwind class merges to resolve — revisit if that
 * changes once real screens compose these components.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
