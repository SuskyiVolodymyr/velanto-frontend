"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";

export interface BackButtonProps {
  /**
   * Where to go when there's no in-app history to pop — e.g. the visitor
   * landed here directly via a shared link or a new tab. Defaults to the home
   * feed so "Back" never dead-ends or leaves the site.
   */
  fallbackHref?: string;
  className?: string;
}

/**
 * A "← Back" control for sub-pages. Prefers popping the in-app history stack;
 * when there is none, routes to {@link BackButtonProps.fallbackHref}.
 */
export function BackButton({ fallbackHref = "/", className }: BackButtonProps) {
  const router = useRouter();
  const t = useTranslations("pages");

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden />
      {t("back")}
    </button>
  );
}
