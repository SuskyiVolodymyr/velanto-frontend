import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/shared/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Mirrors Input's token classes. Matches the `textareaClass` literal that
// several forms hand-copy today, so those can drop the local string and use
// this primitive without a visual change.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-[10px] bg-surface border border-border px-4 py-2.5",
          "text-sm text-foreground placeholder:text-foreground-tertiary",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
          "disabled:opacity-45 disabled:pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
