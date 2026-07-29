"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { Button, type ButtonVariant } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { buildShareUrl } from "@/src/shared/lib/share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function ShareButton({
  path,
  picks,
  resolvePlayId,
  label,
  variant = "secondary",
  compact = false,
  className,
}: {
  path: string;
  picks?: RecordedPick[] | null;
  /**
   * Looked up when the popover opens, to prefer a short `?play=<id>` link over
   * encoding `picks` into `?p=`. A getter rather than a value because the id
   * arrives when the play's record request resolves, which can be after the
   * caller mounted — and because reading it touches sessionStorage, which a
   * render on the server cannot do.
   */
  resolvePlayId?: () => string | null;
  label?: string;
  /** The trigger button's variant (T12: the share/CTA aside card wants the
   * primary cyan treatment; every other caller keeps the original secondary
   * look by omitting this). */
  variant?: ButtonVariant;
  /**
   * Collapse the visible label to icon-only below 481px, keeping the full
   * label as the button's aria-label so it never loses its accessible name.
   * Opt-in — a caller like Pack Detail's crowded sticky header (Back/Share/
   * Report/Vote all fighting for the same row) wants this; a standalone Share
   * CTA elsewhere doesn't, so the default keeps the label always visible.
   */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("share");
  const triggerLabel = label ?? t("trigger");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Built lazily on open: buildShareUrl reads window.location.origin, which only
  // exists client-side, and the input only renders after a click — so no SSR/
  // hydration concern. resolvePlayId is called here for the same reason.
  const url = open ? buildShareUrl(path, picks, resolvePlayId?.()) : "";

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
  }, []);

  const closeAndRefocus = useCallback(() => {
    close();
    triggerRef.current?.focus();
  }, [close]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.select();

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRefocus();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close, closeAndRefocus]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      inputRef.current?.select();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        variant={variant}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={compact ? triggerLabel : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Share2 size={16} aria-hidden />
        {compact ? (
          <span aria-hidden className="hidden min-[481px]:inline">
            {triggerLabel}
          </span>
        ) : (
          triggerLabel
        )}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label={t("dialogLabel")}
          className="absolute right-0 top-12 z-10 flex w-[300px] items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <Input
            ref={inputRef}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="flex-1"
            aria-label={t("urlLabel")}
          />
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
      )}
    </div>
  );
}
