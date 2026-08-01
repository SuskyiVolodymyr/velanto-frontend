"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const t = useTranslations("common");
  // Unique per instance so aria-labelledby stays correct if two Modals
  // ever render concurrently — a hardcoded id would silently collide.
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // No `document` during SSR. A modal is only ever opened by a client
  // interaction, so bailing here can't produce a hydration mismatch — the
  // server and the first client render both see `open: false`.
  if (!open || typeof document === "undefined") return null;

  /**
   * Rendered into `document.body` rather than in place. `position: fixed` is
   * only relative to the viewport while no ancestor establishes a containing
   * block — and `backdrop-filter` does, which the sticky page header uses. A
   * modal opened from a control in that header (Report a pack) was therefore
   * anchored to the header instead of the page: no full-screen dim, and the top
   * of the dialog clipped off. Portalling puts it outside every such ancestor.
   */
  return createPortal(
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full max-w-md flex-col rounded-card border border-border bg-surface-card p-[18px]",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <Text as="h2" id={titleId} variant="title" className="text-lg">
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-[9px] px-2 py-1 text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
