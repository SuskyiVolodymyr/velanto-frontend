import type { ReactNode, TextareaHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";
import { Textarea } from "@/shared/ui/Textarea";
import { FormField } from "@/shared/ui/form/FormField";
import { getFieldError } from "@/shared/ui/form/getFieldError";

export interface TextareaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name"
> {
  name: string;
  label: string;
  srOnlyLabel?: boolean;
  /** Right-aligned label-row adornment (see {@link FormField}). */
  labelTrailing?: ReactNode;
}

/**
 * `Textarea` wired to react-hook-form via `register`, with label + inline error
 * through {@link FormField}.
 */
export function TextareaField({
  name,
  label,
  srOnlyLabel,
  labelTrailing,
  id,
  "aria-describedby": ariaDescribedby,
  ...rest
}: TextareaFieldProps) {
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
      labelTrailing={labelTrailing}
    >
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        {...rest}
        {...register(name)}
        aria-describedby={describedBy}
      />
    </FormField>
  );
}
