import { InputHTMLAttributes, forwardRef } from "react";
import { useFieldIdentity } from "@/src/shared/lib/use-field-identity";
import { cn } from "@/src/shared/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, name, ...props }, ref) => {
    const fieldId = useFieldIdentity(id, name);
    return (
      <input
        ref={ref}
        id={fieldId}
        name={name}
        className={cn(
          "h-[46px] w-full rounded-control bg-background border border-white/10 px-4",
          "text-sm text-foreground placeholder:text-foreground-tertiary",
          "transition-colors duration-150",
          "focus:outline-none focus:border-acc",
          "disabled:opacity-45 disabled:pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
