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
import { cn } from "@/src/shared/lib/cn";

interface HeadToHeadCardProps {
  item: Item;
  selected: boolean;
  onSelect: () => void;
}

// Shared by all three card shapes below, so a selected contender looks the same
// whether it's text, an image, or a video. Matches CandidateCard/SideCard's
// accent border + tinted fill — 1v1 should not invent its own selected look.
const SELECTED_FRAME = "border-acc bg-acc/10";
const UNSELECTED_FRAME = "border-border bg-surface";

function HeadToHeadCard({ item, selected, onSelect }: HeadToHeadCardProps) {
  const t = useTranslations("play");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  // `aria-pressed` rather than a plain button: these are now toggles that hold
  // a selection until it's confirmed, not controls that act on click.
  const pressed = { "aria-pressed": selected } as const;

  if (videoId) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-2xl border transition-colors",
          selected ? SELECTED_FRAME : UNSELECTED_FRAME,
        )}
      >
        <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
        <button
          type="button"
          onClick={onSelect}
          {...pressed}
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
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-2xl border transition-colors",
          selected ? SELECTED_FRAME : UNSELECTED_FRAME,
        )}
      >
        <ImageCard src={mediaUrl(item.value)} alt={item.title} />
        <button
          type="button"
          onClick={onSelect}
          {...pressed}
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
      onClick={onSelect}
      {...pressed}
      aria-label={t("pick", { name: item.title })}
      className={cn(
        "flex min-h-[230px] flex-1 flex-col justify-center gap-3 rounded-2xl border p-4 text-center transition-colors",
        selected
          ? SELECTED_FRAME
          : `${UNSELECTED_FRAME} hover:border-border-strong`,
      )}
    >
      {item.type === "youtube" && <Badge className="mx-auto">YouTube</Badge>}
      <Text className="font-semibold">{item.title}</Text>
    </button>
  );
}

interface HeadToHeadRoundProps {
  left: Item;
  right: Item;
  /** Id of the contender currently chosen, or null while the round is untouched. */
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function HeadToHeadRound({
  left,
  right,
  selectedId,
  onSelect,
}: HeadToHeadRoundProps) {
  return (
    <div className="flex items-center gap-4">
      <HeadToHeadCard
        item={left}
        selected={selectedId === left.id}
        onSelect={() => onSelect(left.id)}
      />
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
        VS
      </span>
      <HeadToHeadCard
        item={right}
        selected={selectedId === right.id}
        onSelect={() => onSelect(right.id)}
      />
    </div>
  );
}
