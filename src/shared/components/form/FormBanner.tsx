import type { ReactNode } from "react";
import { CircleAlert, Check } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

export type FormBannerTone = "danger" | "success";

// Tinted, iconed inline message for a whole form (a failed submit, a
// confirmation) — distinct from a per-field {@link FieldError}. Colours are the
// UI-kit v1 danger/success tints.
const TONE: Record<FormBannerTone, { box: string; icon: ReactNode }> = {
  danger: {
    box: "border-danger/30 bg-danger/10 text-[#ff8c8c]",
    icon: (
      <CircleAlert
        size={15}
        strokeWidth={2}
        aria-hidden
        className="flex-none"
      />
    ),
  },
  success: {
    box: "border-live/30 bg-live/10 text-[#7ee7b4]",
    icon: (
      <Check size={15} strokeWidth={2.4} aria-hidden className="flex-none" />
    ),
  },
};

export function FormBanner({
  tone,
  role,
  children,
}: {
  tone: FormBannerTone;
  /** `alert` for errors (assertive), `status` for success (polite). */
  role?: "alert" | "status";
  children: ReactNode;
}) {
  const styles = TONE[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex items-center gap-2.5 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-semibold",
        styles.box,
      )}
    >
      {styles.icon}
      <span>{children}</span>
    </div>
  );
}
