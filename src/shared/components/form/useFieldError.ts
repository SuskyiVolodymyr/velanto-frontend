import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";

/**
 * A field's error message, translated and gated for display.
 *
 * **Gate:** the message is only returned once the field has been touched
 * (blurred) or the form has been submitted. This keeps real-time validation
 * (`mode: "onTouched"`/`"onChange"`) from flashing an error under a field the
 * user hasn't reached yet, while staying a no-op for the default submit-mode
 * forms (there `isSubmitted` is the gate, exactly as before).
 *
 * **Translation (#236):** zod schemas can't call a React hook, so they cannot
 * translate their own messages — which is how every auth validation error came
 * to be hardcoded English on an otherwise fully-localized form. A schema now
 * carries a stable catalog key (`auth.errors.passwordUpper`) and this hook,
 * which runs inside the provider, resolves it. Same shape as
 * `notification-display.ts` → `NotificationItem`: a pure module names a key, a
 * component translates it.
 *
 * A message that isn't a known key passes through verbatim. That is deliberate
 * rather than lax: `create-pack` and `new-feedback` still carry English
 * literals (velanto-frontend#249), so they keep working untouched and can
 * migrate one at a time. It also means a missing or mistyped key renders as
 * itself rather than throwing — ugly, but the user still learns the field is
 * wrong, which beats a blank error or a crashed form.
 *
 * Consumers must sit inside `NextIntlClientProvider`. In the app that is
 * guaranteed by the root layout; in tests, render through `renderWithIntl`.
 *
 * Supports dotted `name`s (e.g. `"categories.0.name"`) via `getFieldState`.
 */
export function useFieldError(name: string): string | undefined {
  const { getFieldState, formState } = useFormContext();
  // Root namespace: schema keys are full paths, so they can name any namespace
  // without this hook knowing which feature it is rendering for.
  const t = useTranslations();

  const { error, isTouched } = getFieldState(name, formState);
  const message = error?.message;
  if (typeof message !== "string") return undefined;
  if (!isTouched && !formState.isSubmitted) return undefined;

  return t.has(message) ? t(message) : message;
}
