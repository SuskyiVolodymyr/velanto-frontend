"use client";

import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/**
 * Wraps a control a signed-out visitor cannot use, and explains why on click —
 * in a small popup anchored to that control.
 *
 * Replaces the tooltip this used to be. A tooltip states the reason only on
 * hover, which a touch device never does, so on a phone the control simply did
 * nothing with no explanation anywhere.
 *
 * Anchored rather than a centre-screen modal: the question is about the one
 * thing just clicked, and a full-screen dialog for "you need an account to
 * like this" overstates it — it dims the page and demands dismissal for a
 * sentence. Staying beside the control keeps the reason attached to its cause.
 *
 * The older rule still holds and is why this is a popup rather than a redirect:
 * clicking a blocked control must never silently navigate someone to /auth and
 * lose what they were doing. They go only by choosing to, and `next` returns
 * them here.
 *
 * Children render inert (`pointer-events-none`) so the click lands on this
 * wrapper rather than the disabled control inside it.
 */
export function SignInGate({
  message,
  children,
  block = false,
  className,
}: {
  /** Why sign-in is needed, phrased for this specific action. */
  message: string;
  children: ReactElement;
  /** Full-width wrapper, for block-level children like a whole composer. */
  block?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("auth");
  // A real link rather than a router.push below: the gate now wraps controls on
  // nearly every screen, and useRouter throws outside an app-router context —
  // chrome should not be able to take a page down. An anchor also middle-clicks
  // and opens in a new tab, which a button never did.
  //
  // The return path comes from window.location rather than usePathname for the
  // same reason: a hook would make every test that renders a gated control mock
  // next/navigation. Safe here because the panel below only renders once `open`
  // is true, which takes a click — so this never runs on the server.
  const pathname =
    typeof window === "undefined" ? "/" : window.location.pathname;
  const containerRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  // Which edge the panel hangs from. Anchoring always to the start pushed it
  // off the right of the viewport for controls in a right-aligned action row —
  // which is where most gated controls live (Share/Report/vote). Measured at
  // open time rather than guessed from a breakpoint, since it depends on where
  // this particular control sits, not on the window width.
  const [alignEnd, setAlignEnd] = useState(false);

  const PANEL_WIDTH = 260;

  function toggle() {
    setOpen((value) => {
      if (value) return false;
      const rect = containerRef.current?.getBoundingClientRect();
      // Flip to the end edge when a start-anchored panel would not fit.
      if (rect) setAlignEnd(rect.left + PANEL_WIDTH > window.innerWidth - 8);
      return true;
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className={cn(
        "relative",
        // items-center so the wrapped control keeps the vertical alignment it
        // had as a direct child of the action row — a bare inline-flex span
        // sits on the text baseline and drops the control a couple of pixels
        // below its neighbours.
        block ? "block w-full" : "inline-flex items-center",
        className,
      )}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label={message}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => toggle()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "cursor-pointer",
          block ? "block w-full" : "inline-flex items-center",
        )}
      >
        <span
          className={cn(
            "pointer-events-none",
            block ? "block w-full" : "inline-flex items-center",
          )}
        >
          {children}
        </span>
      </span>

      {open && (
        <span
          id={panelId}
          role="dialog"
          aria-label={t("gateHeading")}
          className={cn(
            "absolute top-[calc(100%+8px)] z-40 flex w-[260px] flex-col gap-3 rounded-[14px] border border-border bg-surface-raised p-4 text-start shadow-[0_18px_44px_rgba(0,0,0,0.55)]",
            // Swapped, never both — cn() is a plain join, so start-0 and end-0
            // together would leave the winner to Tailwind's emit order.
            alignEnd ? "end-0" : "start-0",
          )}
        >
          <Text as="span" variant="title" className="text-[14px]">
            {t("gateHeading")}
          </Text>
          <Text variant="secondary" className="text-[13px]">
            {message}
          </Text>
          <Link
            href={`/auth?next=${encodeURIComponent(pathname)}`}
            className={buttonClassName("primary", "w-full")}
          >
            {t("logIn")}
          </Link>
        </span>
      )}
    </span>
  );
}
