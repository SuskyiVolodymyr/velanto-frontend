import { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import { useFieldIdentity } from "@/src/shared/lib/use-field-identity";
import { cn } from "@/src/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Leading icon rendered inside the field (UI-kit v1 auth style). Presence of
   * this or `trailing` switches the field to the bordered "shell" layout. */
  icon?: ReactNode;
  /** Trailing adornment inside the same shell (e.g. a password reveal button). */
  trailing?: ReactNode;
  /** Field background. `card` (surface-card) is for fields sitting on the plain
   * page background — e.g. the auth screen — so they stand out; `base` (default)
   * recedes on a card. */
  surface?: "base" | "card";
}

/**
 * The shared text input. Two layouts:
 *
 * - Plain (default): a single bordered `<input>`, used across forms that sit on
 *   a card surface.
 * - Shell (when `icon` or `trailing` is passed): a bordered container holding a
 *   leading icon, a borderless input, and a trailing slot — the UI-kit v1 auth
 *   field. `aria-invalid` drives the shell's border, and focus is shown on the
 *   container via `focus-within`.
 *
 * `cn()` is a plain join here, so the two layouts are chosen by a branch that
 * emits exactly one class set — never by appending overrides.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, id, name, icon, trailing, surface = "base", ...props },
    ref,
  ) => {
    const fieldId = useFieldIdentity(id, name);
    const invalid = props["aria-invalid"] === true;

    if (!icon && !trailing) {
      return (
        <input
          ref={ref}
          id={fieldId}
          name={name}
          className={cn(
            "h-[46px] w-full rounded-control bg-background border border-white/10 px-4",
            "text-sm text-foreground placeholder:text-foreground-tertiary",
            "transition-colors duration-150",
            "focus:outline-none focus:border-acc focus-visible:ring-2 focus-visible:ring-acc/40",
            "disabled:opacity-45 disabled:pointer-events-none",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-control border ps-3.5 pe-1.5",
          "transition-colors duration-150",
          "focus-within:border-acc focus-within:ring-2 focus-within:ring-acc/40",
          "has-[:disabled]:opacity-45 has-[:disabled]:pointer-events-none",
          surface === "card" ? "bg-surface-card" : "bg-background",
          invalid ? "border-danger/45" : "border-white/10",
        )}
      >
        {icon && (
          <span className="flex-none text-foreground-tertiary [&_svg]:h-[17px] [&_svg]:w-[17px]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          name={name}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none",
            "placeholder:text-foreground-tertiary disabled:pointer-events-none",
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
    );
  },
);

Input.displayName = "Input";
