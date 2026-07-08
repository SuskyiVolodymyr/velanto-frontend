"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full max-w-md flex-col rounded-[15px] border border-border bg-surface p-5",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <Text as="h2" id="modal-title" variant="title" className="text-lg">
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[9px] px-2 py-1 text-foreground-secondary transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
