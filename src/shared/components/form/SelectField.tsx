import type { ReactNode, SelectHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";
import { Select, type SelectOption } from "@/src/shared/components/Select";
import { FormField } from "@/src/shared/components/form/FormField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> {
  name: string;
  label: string;
  srOnlyLabel?: boolean;
  /** Data-driven options; alternatively pass `<option>` children. */
  options?: SelectOption[];
  children?: ReactNode;
}

/**
 * Native `Select` wired to react-hook-form via `register` (native controls
 * register directly — no `Controller` needed), with label + inline error
 * through {@link FormField}.
 */
export function SelectField({
  name,
  label,
  srOnlyLabel,
  id,
  options,
  children,
  ...rest
}: SelectFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldId = id ?? name;
  const error = getFieldError(errors, name);

  return (
    <FormField htmlFor={fieldId} label={label} error={error} srOnlyLabel={srOnlyLabel}>
      <Select
        id={fieldId}
        options={options}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
        {...register(name)}
      >
        {children}
      </Select>
    </FormField>
  );
}
