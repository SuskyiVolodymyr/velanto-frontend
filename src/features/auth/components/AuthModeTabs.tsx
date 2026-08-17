"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";

export type AuthMode = "login" | "register";

const TAB_CLASS =
  "flex-1 h-[38px] rounded-[9px] text-[13.5px] font-[650] transition-colors duration-200";

export interface AuthModeTabsProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

/** The login / sign-up segmented tabs above the auth card. */
export function AuthModeTabs({ mode, onChange }: AuthModeTabsProps) {
  const t = useTranslations("auth");
  const isRegister = mode === "register";

  return (
    <div
      className="mb-6 flex gap-1 rounded-[13px] border border-white/[0.08] bg-white/[0.04] p-1"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isRegister}
        onClick={() => onChange("login")}
        className={cn(
          TAB_CLASS,
          !isRegister
            ? "bg-white/[0.12] text-foreground"
            : "text-foreground-secondary",
        )}
      >
        {t("logIn")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isRegister}
        onClick={() => onChange("register")}
        className={cn(
          TAB_CLASS,
          isRegister
            ? "bg-white/[0.12] text-foreground"
            : "text-foreground-secondary",
        )}
      >
        {t("tabSignup")}
      </button>
    </div>
  );
}
