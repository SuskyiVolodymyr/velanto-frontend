import type { InputHTMLAttributes, ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { Text } from "@/src/shared/components/Text";
import { useFieldError } from "@/src/shared/components/form/useFieldError";
import { cn } from "@/src/shared/lib/cn";

export interface CheckboxFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
> {
  /** Field name; must exist on the form's schema. */
  name: string;
  /**
   * Label content shown beside the box. A `ReactNode` (not just a string) so
   * callers can embed inline elements such as links. Any interactive child
   * (e.g. a link) should stop click propagation so it doesn't also toggle the
   * box.
   */
  label: ReactNode;
}

/**
 * Checkbox wired to the surrounding react-hook-form context via `register`,
 * with an inline error message. Unlike {@link TextField} it does not reuse
 * {@link FormField}: the label sits beside the box (not above it) and carries
 * rich content, so it renders its own layout while keeping the same
 * `${id}-error` / `aria-describedby` / `role="alert"` error convention.
 */
export function CheckboxField({
  name,
  label,
  id,
  className,
  "aria-describedby": ariaDescribedby,
  ...rest
}: CheckboxFieldProps) {
  const { register } = useFormContext();
  const fieldId = id ?? name;
  const error = useFieldError(name);
  const describedBy =
    [error ? `${fieldId}-error` : undefined, ariaDescribedby]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <input
          id={fieldId}
          type="checkbox"
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-acc",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
            "disabled:opacity-45 disabled:pointer-events-none",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...rest}
          {...register(name)}
          aria-describedby={describedBy}
        />
        <label
          htmlFor={fieldId}
          className="text-sm text-foreground-secondary leading-snug"
        >
          {label}
        </label>
      </div>
      {error && (
        <Text
          id={`${fieldId}-error`}
          role="alert"
          className="text-sm text-[#ff6b6b]"
        >
          {error}
        </Text>
      )}
    </div>
  );
}
