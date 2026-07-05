import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/shared/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[10px] bg-surface border border-border px-4",
          "text-sm text-foreground placeholder:text-foreground-tertiary",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:border-transparent",
          "disabled:opacity-45 disabled:pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
