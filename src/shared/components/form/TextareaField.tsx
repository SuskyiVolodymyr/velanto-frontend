import type { TextareaHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";
import { Textarea } from "@/src/shared/components/Textarea";
import { FormField } from "@/src/shared/components/form/FormField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";

export interface TextareaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> {
  name: string;
  label: string;
  srOnlyLabel?: boolean;
}

/**
 * `Textarea` wired to react-hook-form via `register`, with label + inline error
 * through {@link FormField}.
 */
export function TextareaField({ name, label, srOnlyLabel, id, ...rest }: TextareaFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldId = id ?? name;
  const error = getFieldError(errors, name);

  return (
    <FormField htmlFor={fieldId} label={label} error={error} srOnlyLabel={srOnlyLabel}>
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
        {...register(name)}
      />
    </FormField>
  );
}
