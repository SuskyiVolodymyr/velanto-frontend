import type { ReactNode } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface FormFieldProps {
  /** Must match the `id` of the control rendered as `children`. */
  htmlFor: string;
  label: string;
  /** Error message to show under the control, if any. */
  error?: string;
  /** Visually hide the label (still read by screen readers / used by tests). */
  srOnlyLabel?: boolean;
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
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          srOnlyLabel ? "sr-only" : "text-xs text-foreground-secondary",
        )}
      >
        {label}
      </label>
      {children}
      {error && (
        <Text id={`${htmlFor}-error`} role="alert" className="text-sm text-[#ff6b6b]">
          {error}
        </Text>
      )}
    </div>
  );
}
