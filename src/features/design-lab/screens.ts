/**
 * Every page in the lab, for the bar's own nav.
 *
 * A lab page hides the app's nav rail (it is imitating a live room, which
 * does), so without this each one is an island you can only leave by going
 * home and typing the next URL.
 */
export const LAB_SCREENS = [
  { href: "/design/rooms/between", label: "Between rounds" },
  { href: "/design/rooms/guessing", label: "Guessing" },
  { href: "/design/rooms/results", label: "Results" },
] as const;
