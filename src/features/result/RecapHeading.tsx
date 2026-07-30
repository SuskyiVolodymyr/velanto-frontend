import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

/**
 * The recap column's heading — the mock's caps cyan "ROUND BY ROUND" and its
 * note on ONE baseline row, not stacked.
 *
 * Shared by all four format screens rather than repeated, because
 * `ResultScreen`'s aside offsets itself by exactly this row's height plus the
 * section gap so it starts level with the first round card. Four hand-rolled
 * copies meant four different heights, so the aside lined up on save_one and
 * floated on 1v1/nxn/rank_blind.
 *
 * The `h2` is a plain element, not `<Text as="h2">`: every Text variant sets a
 * colour and `cn()` is a plain join, so a `text-acc` handed in from outside
 * loses to the variant's own `text-foreground` (see Text's doc comment) and
 * the heading rendered white instead of #00E5FF.
 */
export function RecapHeading({ shared }: { shared: boolean }) {
  const t = useTranslations("result");
  return (
    <div className="flex flex-wrap items-baseline gap-[10px]">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-acc">
        {t("roundByRoundHeading")}
      </h2>
      <Text variant="tertiary" className="text-[12.5px]">
        {t(shared ? "roundByRoundNoteShared" : "roundByRoundNote")}
      </Text>
    </div>
  );
}
