import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

// How close a panel's edge may sit to the viewport edge before it counts as
// overflowing — matches the page gutters used elsewhere, so a clamped panel
// lines up with the rest of the layout instead of touching the glass.
const MARGIN = 16;

/**
 * Nudges an absolutely-positioned, corner-anchored popover panel back
 * on-screen when its default position would overflow the viewport
 * horizontally — e.g. a right-anchored panel whose trigger sits well left of
 * center on a narrow screen (Pack Detail's crowded sticky bar: Back/Share/
 * Report/Vote all in one row). Purely horizontal: panels in this app open
 * downward near the top of the page and don't overflow vertically in
 * practice.
 *
 * Deliberately NOT a repositioning/flip strategy (no floating-ui-style
 * collision detection) — the panel keeps its normal CSS anchor and this only
 * adds a corrective `translateX`, so it's a no-op on any layout that already
 * fits. Re-measures on open and on viewport resize.
 *
 * The shift is backed out of each measurement (`rect.left/right` already
 * include the previously-applied transform) so repeated recalculation
 * converges instead of compounding.
 */
export function useHorizontalClamp(
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
): CSSProperties {
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);

  useLayoutEffect(() => {
    if (!open) {
      shiftRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- layout correction: must land before paint (React batches this with the render that just opened the panel) or the un-clamped position flashes on screen first.
      setShift(0);
      return;
    }

    function recalc() {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const naturalLeft = rect.left - shiftRef.current;
      const naturalRight = rect.right - shiftRef.current;
      let next = 0;
      if (naturalLeft < MARGIN) {
        next = MARGIN - naturalLeft;
      } else if (naturalRight > window.innerWidth - MARGIN) {
        next = window.innerWidth - MARGIN - naturalRight;
      }
      shiftRef.current = next;
      setShift(next);
    }

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [open, panelRef]);

  return shift === 0 ? {} : { transform: `translateX(${shift}px)` };
}
