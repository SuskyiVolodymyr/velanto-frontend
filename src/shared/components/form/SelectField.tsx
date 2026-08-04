import { Controller, useFormContext } from "react-hook-form";
import {
  Dropdown,
  type DropdownOption,
} from "@/src/shared/components/Dropdown";
import { FormField } from "@/src/shared/components/form/FormField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";

export interface SelectFieldProps {
  name: string;
  label: string;
  srOnlyLabel?: boolean;
  options: DropdownOption<string>[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

/**
 * The app's {@link Dropdown} wired to react-hook-form, with label + inline error
 * through {@link FormField}.
 *
 * Driven by `Controller` rather than `register`: this control is a button plus
 * a listbox, not a native `<select>`, so there is no change event for RHF to
 * bind to. It was a native select — which opens an OS menu that ignores every
 * token in the app, rendering as a light system list on a dark page.
 */
export function SelectField({
  name,
  label,
  srOnlyLabel,
  id,
  options,
  placeholder,
  disabled,
  "aria-describedby": ariaDescribedby,
}: SelectFieldProps) {
  const {
    control,
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
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Dropdown
            id={fieldId}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            value={(field.value as string) ?? ""}
            onChange={field.onChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      />
    </FormField>
  );
}
