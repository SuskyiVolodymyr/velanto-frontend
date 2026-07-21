/**
 * Put the next round at the top of the viewport. Used by nxn ONLY.
 *
 * An nxn round is the tall one — two sides of up to eight items each — so
 * confirming a pick from the bottom of one left the player halfway down the
 * next, looking at its middle. The page doesn't remount between rounds (same
 * route, same component), so nothing resets the scroll on its own.
 *
 * The other formats deliberately don't call this: their rounds fit on a screen,
 * and yanking the viewport on every confirm is worse than leaving it alone.
 *
 * `auto` rather than `smooth`: the content underneath has already been replaced
 * by the time this runs, so animating the trip would scroll PAST the new round
 * on the way up. Respecting prefers-reduced-motion is moot for the same reason.
 */
export function scrollToRoundTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "auto" });
}
