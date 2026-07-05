import { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[15px] bg-surface border border-border p-5",
        "transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)]",
        "hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.42)]",
        className,
      )}
      {...props}
    />
  );
}
