import { useFormContext } from "react-hook-form";

/**
 * A field's error message, gated for display: it is only returned once the
 * field has been touched (blurred) or the form has been submitted. This keeps
 * real-time validation (`mode: "onTouched"`/`"onChange"`) from flashing an error
 * under a field the user hasn't reached yet, while staying a no-op for the
 * default submit-mode forms (there `isSubmitted` is the gate, exactly as before).
 *
 * Supports dotted `name`s (e.g. `"categories.0.name"`) via `getFieldState`.
 */
export function useFieldError(name: string): string | undefined {
  const { getFieldState, formState } = useFormContext();
  const { error, isTouched } = getFieldState(name, formState);
  const message = error?.message;
  if (typeof message !== "string") return undefined;
  return isTouched || formState.isSubmitted ? message : undefined;
}
