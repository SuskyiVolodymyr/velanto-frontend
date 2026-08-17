import { useTranslations } from "next-intl";
import { getRoundsCount } from "@/shared/utils/pack-display";
import { Text } from "@/shared/components/Text";
import type { Pack, PackOverview } from "@/shared/types/pack";

/**
 * The length-of-run line under the Play button ("N rounds"). Deliberately just
 * the round count — an honest, already-localized figure — rather than a fake
 * minutes estimate.
 */
export function PackPlayEstimate({ pack }: { pack: Pack | PackOverview }) {
  const t = useTranslations("pack");
  const rounds = getRoundsCount(pack);

  return (
    <Text variant="tertiary" className="text-center text-xs">
      {t("roundsCount", { count: rounds })}
    </Text>
  );
}
