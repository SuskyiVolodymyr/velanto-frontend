import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/src/shared/components/Input";
import { FormField } from "@/src/shared/components/form/FormField";
import { useFieldError } from "@/src/shared/components/form/useFieldError";

export interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
> {
  /** Field name; must exist on the form's schema. */
  name: string;
  label: string;
  /** Visually hide the label but keep it for a11y (placeholder-driven inputs). */
  srOnlyLabel?: boolean;
  /** Accessible label for the toggle when the password is hidden ("Show password"). */
  showLabel: string;
  /** Accessible label for the toggle when the password is visible ("Hide password"). */
  hideLabel: string;
}

/**
 * Like {@link TextField} but for passwords: adds a trailing eye button that
 * toggles the value between masked and plain text. The toggle is a real
 * `<button type="button">` (never submits) with an `aria-label` describing the
 * next action and `aria-pressed` reflecting the current visibility.
 */
export function PasswordField({
  name,
  label,
  srOnlyLabel,
  showLabel,
  hideLabel,
  id,
  "aria-describedby": ariaDescribedby,
  ...rest
}: PasswordFieldProps) {
  const { register } = useFormContext();
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? name;
  const error = useFieldError(name);
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
      <div className="relative">
        <Input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          // Reserves room for the show/hide toggle. Logical, and it has to stay
          // in step with the toggle's own `end-1` below — if one flips under
          // RTL and the other doesn't, the button sits on top of the text.
          className="pe-11"
          {...rest}
          {...register(name)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute inset-y-1 end-1 flex items-center rounded-[8px] px-2.5 text-foreground-tertiary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:text-foreground"
          tabIndex={rest.disabled ? -1 : 0}
          disabled={rest.disabled}
        >
          {visible ? (
            <EyeOff size={18} aria-hidden />
          ) : (
            <Eye size={18} aria-hidden />
          )}
        </button>
      </div>
    </FormField>
  );
}
