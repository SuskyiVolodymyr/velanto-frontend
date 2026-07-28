"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";

/**
 * The sticky top bar's action: a quick play-again link, always reachable
 * without scrolling (T12).
 *
 * Used to also carry the Share button, but that moved into the aside's
 * consolidated ResultAgainPanel card (T12) — a fixed-position action still
 * earns its keep here because the aside sits BELOW the recap on narrow
 * viewports (ResultScreen's grid is single-column under `lg`), so without
 * this a mobile reader has to scroll past the whole recap to replay the
 * pack. `status`/`picks` are no longer needed now that Share lives
 * elsewhere.
 *
 * On a SHARED result the link reads "Try it yourself" instead of "Play again":
 * the reader is looking at someone else's run and has not played at all, so
 * "again" was telling them to repeat something they never did.
 */
export function ResultActions({
  packId,
  shared = false,
  className,
}: {
  packId: string;
  shared?: boolean;
  className?: string;
}) {
  const t = useTranslations("result");
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href={`/packs/${packId}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        {shared ? t("tryItYourself") : t("playAgain")}
      </Link>
    </div>
  );
}
