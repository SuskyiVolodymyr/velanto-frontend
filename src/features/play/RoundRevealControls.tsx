import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

interface RoundRevealControlsProps {
  revealedCount: number;
  totalCount: number;
  canRevealMore: boolean;
  onRevealNext: () => void;
  onRevealAll: () => void;
}

export function RoundRevealControls({
  revealedCount,
  totalCount,
  canRevealMore,
  onRevealNext,
  onRevealAll,
}: RoundRevealControlsProps) {
  const t = useTranslations("play");
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Text variant="tertiary" className="text-sm">
        {t("showingOf", { revealed: revealedCount, total: totalCount })}
      </Text>
      {canRevealMore && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRevealNext}>
            {t("showNext")}
          </Button>
          <Button variant="ghost" onClick={onRevealAll}>
            {t("showAll")}
          </Button>
        </div>
      )}
    </div>
  );
}
