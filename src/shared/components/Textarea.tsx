import { TextareaHTMLAttributes, forwardRef } from "react";
import { useFieldIdentity } from "@/src/shared/lib/use-field-identity";
import { cn } from "@/src/shared/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Mirrors Input's token classes. Matches the `textareaClass` literal that
// several forms hand-copy today, so those can drop the local string and use
// this primitive without a visual change.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, id, name, ...props }, ref) => {
    const fieldId = useFieldIdentity(id, name);
    return (
      <textarea
        ref={ref}
        id={fieldId}
        name={name}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-control bg-background border border-white/10 px-4 py-[11px]",
          "text-sm text-foreground placeholder:text-foreground-tertiary",
          "transition-colors duration-150",
          "focus:outline-none focus:border-acc focus-visible:ring-2 focus-visible:ring-acc/40",
          "disabled:opacity-45 disabled:pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
