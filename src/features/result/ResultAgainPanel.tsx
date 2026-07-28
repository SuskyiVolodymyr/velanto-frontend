import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";

/**
 * The footer CTA panel every result page ends with (T11, mock lines 100–110):
 * a nudge to play again, plus a way out to browse more packs.
 *
 * The mock's own body copy ("Groups reshuffle their random pools each time you
 * play") is retired vocabulary — "groups" was the pre-redesign name for pools.
 * Shipped copy below says "rounds" and "pools" instead.
 *
 * The play link here is deliberately WORDED DIFFERENTLY from `ResultActions`'s
 * sticky-bar link ("Play again" / "Try it yourself"): both can be on screen at
 * once (the bar is sticky, this panel sits at the page bottom), and two links
 * sharing one accessible name is exactly the class of bug a Critical finding
 * caught in the Create Pack slice. `shared` still needs its own wording here
 * too, for the same reason `ResultActions` has it — a shared-link reader has
 * not played this pack at all, so "again" would misdescribe what they'd be
 * doing.
 */
export function ResultAgainPanel({
  packId,
  shared,
}: {
  packId: string;
  shared: boolean;
}) {
  const t = useTranslations("result");

  return (
    <div className="flex flex-wrap items-center justify-between gap-[18px] rounded-card border border-border bg-surface-card p-[26px_24px]">
      <div>
        <Text className="text-base font-semibold">{t("againHeading")}</Text>
        <Text variant="secondary" className="mt-1 text-[13px]">
          {t("againBody")}
        </Text>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonClassName("secondary")}>
          {t("exploreMore")}
        </Link>
        <Link
          href={`/packs/${packId}/play`}
          className={buttonClassName("primary")}
        >
          {shared ? t("tryItYourselfFooter") : t("playAgainFooter")}
        </Link>
      </div>
    </div>
  );
}
