import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

interface PlayProgressProps {
  isFinished: boolean;
  roundIndex: number;
  totalRounds: number;
  progressPct: number;
}

export function PlayProgress({
  isFinished,
  roundIndex,
  totalRounds,
  progressPct,
}: PlayProgressProps) {
  const t = useTranslations("play");
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {isFinished
            ? t("complete")
            : t("roundOf", { current: roundIndex + 1, total: totalRounds })}
        </Text>
      </div>
      <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-acc transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
