import { useTranslations } from "next-intl";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The length-of-run line under the Play button ("N rounds"). Deliberately just
 * the round count — an honest, already-localized figure — rather than a fake
 * minutes estimate.
 */
export function PackPlayEstimate({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const rounds = getRoundsCount(pack);

  return (
    <Text variant="tertiary" className="text-center text-xs">
      {t("roundsCount", { count: rounds })}
    </Text>
  );
}
