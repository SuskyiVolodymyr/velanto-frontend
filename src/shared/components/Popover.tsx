"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/src/shared/lib/cn";

/**
 * A lightweight disclosure popover: a trigger button that toggles a floating
 * panel, which closes on an outside mousedown, on Escape (returning focus to the
 * trigger), and whenever the panel calls the `close` it receives. Non-modal and
 * non-trapping — the same pattern {@link UserMenu} already ships, generalised so
 * the browse filter bar can reuse it for both the "Filters" panel and the sort
 * dropdown. A modal opened INSIDE the panel (e.g. TagFilter's tag picker) takes
 * Escape precedence — the popover ignores Escape while such a modal is open, so
 * the first Escape dismisses the modal and only a second closes the popover.
 *
 * The panel is a `role="dialog"` named by `panelLabel`; its content can be a
 * node or a render function `(close) => node` when an inner control needs to
 * dismiss the popover (e.g. picking a sort option).
 */
export function Popover({
  label,
  panelLabel,
  children,
  align = "start",
  triggerClassName,
  panelClassName,
  triggerAriaLabel,
}: {
  /** Trigger button content. */
  label: ReactNode;
  /** Accessible name for the panel dialog. */
  panelLabel: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Which trigger edge the panel aligns to. */
  align?: "start" | "end";
  triggerClassName?: string;
  panelClassName?: string;
  /** Overrides the trigger's accessible name when `label` isn't plain text. */
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // A modal open inside the panel owns Escape — let it dismiss itself first
      // rather than tearing down the whole popover from under it.
      if (containerRef.current?.querySelector('[aria-modal="true"]')) return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName}
      >
        {label}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={panelLabel}
          className={cn(
            "absolute top-[calc(100%+8px)] z-30",
            align === "end" ? "end-0" : "start-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
