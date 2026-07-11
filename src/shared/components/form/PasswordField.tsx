import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/src/shared/components/Input";
import { FormField } from "@/src/shared/components/form/FormField";
import { useFieldError } from "@/src/shared/components/form/useFieldError";

export interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "type"> {
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
          className="pr-11"
          {...rest}
          {...register(name)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 flex items-center rounded-[8px] px-2.5 text-foreground-tertiary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:text-foreground"
          tabIndex={rest.disabled ? -1 : 0}
          disabled={rest.disabled}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </FormField>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 3.19" />
      <path d="M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
