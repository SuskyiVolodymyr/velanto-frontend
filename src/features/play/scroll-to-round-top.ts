/**
 * Put the next round at the top of the viewport.
 *
 * A round can be taller than the screen — eight candidates, an 8-a-side versus
 * matchup, a video card — so confirming a pick from the bottom of one round
 * left the player halfway down the next one, looking at its middle. The page
 * doesn't remount between rounds (same route, same component), so nothing
 * resets the scroll on its own.
 *
 * `auto` rather than `smooth`: the content underneath has already been replaced
 * by the time this runs, so animating the trip would scroll PAST the new round
 * on the way up. Respecting prefers-reduced-motion is moot for the same reason.
 */
export function scrollToRoundTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "auto" });
}
