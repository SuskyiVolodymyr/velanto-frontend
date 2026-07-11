import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";

interface CandidateCardProps {
  item: Item;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One candidate in a groups-format round. A youtube item with a resolvable id
 * renders a real player above a dedicated "Pick …" control (so interacting
 * with the video area doesn't select the item); everything else renders as a
 * single selectable card.
 */
export function CandidateCard({
  item,
  index,
  selected,
  onSelect,
}: CandidateCardProps) {
  const t = useTranslations("play");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;

  if (videoId) {
    return (
      <div
        className={cn(
          "w-[200px] flex-none overflow-hidden rounded-2xl border transition-colors",
          selected ? "border-acc bg-acc/10" : "border-border bg-surface",
        )}
      >
        <YouTubeCard videoId={videoId} />
        <button
          type="button"
          onClick={onSelect}
          aria-label={t("pick", { name: item.title })}
          className="flex w-full items-center gap-2 p-4 text-left"
        >
          <span
            aria-hidden
            className={cn(
              "h-4 w-4 flex-none rounded border",
              selected ? "border-acc bg-acc" : "border-border-strong",
            )}
          />
          <Text className="flex-1 font-semibold">{item.title}</Text>
          <Text variant="tertiary" className="text-xs">
            {String(index + 1).padStart(2, "0")}
          </Text>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-[200px] flex-none rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-acc bg-acc/10"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      {item.type === "youtube" && <Badge className="mb-2">YouTube</Badge>}
      <Text className="font-semibold">{item.title}</Text>
      <Text variant="tertiary" className="mt-1 text-xs">
        {String(index + 1).padStart(2, "0")}
      </Text>
    </button>
  );
}
