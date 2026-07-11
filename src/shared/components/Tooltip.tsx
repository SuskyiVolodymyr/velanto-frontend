"use client";

import { cloneElement, useId, useState, type ReactElement } from "react";

/**
 * A small hover/focus tooltip that states a reason. Used to explain why an
 * action is blocked (e.g. "Log in to vote") on a control the viewer can't use.
 *
 * Wraps a single interactive child: the reason appears on pointer hover and on
 * keyboard focus, and the child is linked to it via `aria-describedby` while
 * open, so screen-reader users hear the reason when they focus the control.
 * The trigger must stay focusable/hoverable — block it with `aria-disabled`,
 * not the `disabled` attribute, or neither hover nor focus will fire.
 */
export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span
          role="tooltip"
          id={id}
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-black/40"
        >
          {content}
        </span>
      )}
    </span>
  );
}
