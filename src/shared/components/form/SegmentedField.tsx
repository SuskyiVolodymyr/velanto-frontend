import { Controller, useFormContext } from "react-hook-form";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/src/shared/components/SegmentedControl";
import { FormField } from "@/src/shared/components/form/FormField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";

export interface SegmentedFieldProps<T extends string> {
  name: string;
  label: string;
  options: SegmentedControlOption<T>[];
  srOnlyLabel?: boolean;
  /** Accessible name for the radiogroup; defaults to `label`. */
  ariaLabel?: string;
}

/**
 * `SegmentedControl` (a controlled, non-native radiogroup) bound to
 * react-hook-form through a `Controller`, with label + inline error through
 * {@link FormField}.
 */
export function SegmentedField<T extends string>({
  name,
  label,
  options,
  srOnlyLabel,
  ariaLabel,
}: SegmentedFieldProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = getFieldError(errors, name);

  return (
    <FormField htmlFor={name} label={label} error={error} srOnlyLabel={srOnlyLabel}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <SegmentedControl
            options={options}
            value={field.value as T}
            onChange={field.onChange}
            ariaLabel={ariaLabel ?? label}
          />
        )}
      />
    </FormField>
  );
}
