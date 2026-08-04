"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getPreviousPath } from "@/src/shared/lib/in-app-history";

/**
 * One page a back control is willing to return to, and what to call it.
 *
 * `match` is tested against the previous path. A page lists only the origins it
 * is actually reachable from — an ALLOW-list, not a ban-list, which is what
 * keeps this from degenerating into browser-back: arriving at a pack from the
 * editor, or at a profile from a hover card on some unrelated screen, matches
 * nothing and falls through to the fallback.
 */
export interface BackOrigin {
  match: RegExp;
  /** Full i18n key, e.g. `shell.nav.people` — resolved against the root. */
  labelKey: string;
}

export interface BackTarget {
  href: string;
  label: string;
}

/**
 * Resolves a page's back pill: the page it was opened from when that is one of
 * `origins`, and `fallback` otherwise.
 *
 * Returns a real href rather than driving `history.back()`. Three things follow
 * from that, all of them the point: the pill stays an ordinary link (so
 * middle-click and open-in-new-tab work), its label always names the page it
 * will actually open, and a stale history stack can't send someone somewhere
 * the page never sanctioned.
 *
 * The effect reads sessionStorage ONCE and stores only the path — a string.
 * Everything else is derived during render. Storing the finished label instead
 * would mean depending on `t` in the effect, and next-intl hands back a new
 * function identity every render, so the effect would re-run, set state, and
 * re-render forever.
 *
 * Read after mount, not during render, because sessionStorage does not exist on
 * the server: consulting it inline would make the server and client markup
 * disagree. The pill shows `fallback` for one paint.
 */
export function useBackTarget(
  fallback: BackTarget,
  origins: BackOrigin[],
): BackTarget {
  const t = useTranslations();
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    setPreviousPath(getPreviousPath());
  }, []);

  if (previousPath === null) return fallback;
  const origin = origins.find((candidate) =>
    candidate.match.test(previousPath),
  );
  if (!origin) return fallback;
  return { href: previousPath, label: t(origin.labelKey) };
}
