import type { ReactNode } from "react";
import { FieldError } from "@/src/shared/components/form/FieldError";
import { cn } from "@/src/shared/lib/cn";

export interface FormFieldProps {
  /** Must match the `id` of the control rendered as `children`. */
  htmlFor: string;
  label: string;
  /** Error message to show under the control, if any. */
  error?: string;
  /** Visually hide the label (still read by screen readers / used by tests). */
  srOnlyLabel?: boolean;
  /**
   * Right-aligned adornment on the label row — a live character counter, a
   * "· optional" note. Kept out of the `<label>` element itself so it never
   * becomes part of the control's accessible name; mark it `aria-hidden` if it
   * only restates something the control already conveys.
   */
  labelTrailing?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Layout primitive for a single form control: a `<label>` bound to the control
 * via `htmlFor`, the control itself, and an inline error message. The error
 * paragraph's id is `${htmlFor}-error` so a control can point at it with
 * `aria-describedby`. The field components in this folder wire that up.
 */
export function FormField({
  htmlFor,
  label,
  error,
  srOnlyLabel,
  labelTrailing,
  className,
  children,
}: FormFieldProps) {
  const labelEl = (
    <label
      htmlFor={htmlFor}
      className={cn(
        srOnlyLabel ? "sr-only" : "text-xs text-foreground-secondary",
      )}
    >
      {label}
    </label>
  );
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {labelTrailing ? (
        <div className="flex items-baseline gap-2.5">
          {labelEl}
          <div className="ms-auto">{labelTrailing}</div>
        </div>
      ) : (
        labelEl
      )}
      {children}
      {error && <FieldError id={`${htmlFor}-error`}>{error}</FieldError>}
    </div>
  );
}
