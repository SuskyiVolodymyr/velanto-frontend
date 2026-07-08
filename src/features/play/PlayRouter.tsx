import type { Pack } from "@/src/shared/types/pack";
import { PlayScreen } from "@/src/features/play/PlayScreen";
import { RankPlayScreen } from "@/src/features/play/RankPlayScreen";
import { HeadToHeadPlayScreen } from "@/src/features/play/HeadToHeadPlayScreen";

export function PlayRouter({ pack }: { pack: Pack }) {
  if (pack.format === "rank_blind") return <RankPlayScreen pack={pack} />;
  if (pack.format === "1v1") return <HeadToHeadPlayScreen pack={pack} />;
  return <PlayScreen pack={pack} />;
}
