import type { InputHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/src/shared/components/Input";
import { FormField } from "@/src/shared/components/form/FormField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name"
> {
  /** Field name; must exist on the form's schema. */
  name: string;
  label: string;
  /** Visually hide the label but keep it for a11y (placeholder-driven inputs). */
  srOnlyLabel?: boolean;
}

/**
 * `Input` wired to the surrounding react-hook-form context via `register`.
 * Renders its label + inline error through {@link FormField}. Pull `control`
 * from a parent `<FormProvider>`.
 */
export function TextField({
  name,
  label,
  srOnlyLabel,
  id,
  "aria-describedby": ariaDescribedby,
  ...rest
}: TextFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldId = id ?? name;
  const error = getFieldError(errors, name);
  // Merge the error association with any caller-supplied describedby (e.g. a
  // hint id) so neither clobbers the other.
  const describedBy =
    [error ? `${fieldId}-error` : undefined, ariaDescribedby]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <FormField
      htmlFor={fieldId}
      label={label}
      error={error}
      srOnlyLabel={srOnlyLabel}
    >
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        {...rest}
        {...register(name)}
        aria-describedby={describedBy}
      />
    </FormField>
  );
}
