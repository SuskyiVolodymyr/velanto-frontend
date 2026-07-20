import { useTranslations } from "next-intl";
import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";

interface HeadToHeadCardProps {
  item: Item;
  onPick: () => void;
}

function HeadToHeadCard({ item, onPick }: HeadToHeadCardProps) {
  const t = useTranslations("play");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  if (videoId) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors">
        <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
        <button
          type="button"
          onClick={onPick}
          aria-label={t("pick", { name: item.title })}
          className="flex min-h-[80px] flex-1 items-center justify-center p-4 text-center transition-colors hover:bg-white/[0.04]"
        >
          <Text className="font-semibold">{item.title}</Text>
        </button>
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors">
        <ImageCard src={mediaUrl(item.value)} alt={item.title} />
        <button
          type="button"
          onClick={onPick}
          aria-label={t("pick", { name: item.title })}
          className="flex min-h-[80px] flex-1 items-center justify-center p-4 text-center transition-colors hover:bg-white/[0.04]"
        >
          <Text className="font-semibold">{item.title}</Text>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={t("pick", { name: item.title })}
      className="flex min-h-[230px] flex-1 flex-col justify-center gap-3 rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-border-strong"
    >
      {item.type === "youtube" && <Badge className="mx-auto">YouTube</Badge>}
      <Text className="font-semibold">{item.title}</Text>
    </button>
  );
}

interface HeadToHeadRoundProps {
  left: Item;
  right: Item;
  onPick: (id: string) => void;
}

export function HeadToHeadRound({ left, right, onPick }: HeadToHeadRoundProps) {
  return (
    <div className="flex items-center gap-4">
      <HeadToHeadCard item={left} onPick={() => onPick(left.id)} />
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
        VS
      </span>
      <HeadToHeadCard item={right} onPick={() => onPick(right.id)} />
    </div>
  );
}
