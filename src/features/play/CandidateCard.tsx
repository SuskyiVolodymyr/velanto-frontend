import { useTranslations } from "next-intl";
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
import { toneFor, HAIRLINE_OVERLAY_STYLE } from "@/src/features/play/candidate-tone";
import type { Item } from "@/src/shared/types/pack";

interface CandidateCardProps {
  item: Item;
  index: number;
  selected: boolean;
  onSelect: () => void;
  /**
   * The pack's cover tone. Seeds which `COVER_TONES` entry a text-item's
   * gradient tile starts from, so every card in a pack draws from that pack's
   * own palette family instead of a fixed global cycle.
   */
  packCoverTone: string;
}

const FRAME_SELECTED = "border-acc ring-[3px] ring-acc/30";
const FRAME_UNSELECTED = "border-border hover:border-border-strong";

/** The checkbox + title + index row shared by all three media treatments. */
function SelectBar({
  title,
  index,
  selected,
}: {
  title: string;
  index: number;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[11px] border-t border-border p-[13px_14px]",
        selected ? "bg-acc/[0.12]" : "bg-white/[0.02]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-[19px] w-[19px] flex-none items-center justify-center rounded-chip border-[1.5px]",
          selected ? "border-acc bg-acc" : "border-border-strong",
        )}
      >
        {selected && (
          <span className="mb-[2px] h-[7px] w-[4px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#07131a]" />
        )}
      </span>
      <Text className="flex-1 text-[14.5px] font-semibold">{title}</Text>
      <Text variant="tertiary" className="text-[11px]">
        {String(index + 1).padStart(2, "0")}
      </Text>
    </div>
  );
}

/**
 * The new gradient media tile for a plain-text candidate (and the fallback
 * for a youtube item whose id couldn't be resolved) — today's text card had
 * no media band at all, so this is the single biggest visual change here.
 */
function TextTile({
  item,
  index,
  packCoverTone,
}: {
  item: Item;
  index: number;
  packCoverTone: string;
}) {
  const tone = toneFor(packCoverTone, index);
  return (
    <div
      className="relative h-[150px] overflow-hidden"
      style={{
        background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
      }}
    >
      <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
      <Text
        variant="tertiary"
        className="absolute start-2 top-2 text-[11px] font-semibold"
      >
        {String(index + 1).padStart(2, "0")}
      </Text>
      {item.type === "youtube" && (
        <Badge className="absolute end-2 top-2">YouTube</Badge>
      )}
    </div>
  );
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
  packCoverTone,
}: CandidateCardProps) {
  const t = useTranslations("play");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;
  // Cards grow in one-by-one, 900ms apart, staggered by position — the
  // deliberate "the stagger IS the reveal" mechanic (see the 2.0.0 redesign
  // plan's D1). Keep this exact per-index delay if the frame markup changes.
  const appearDelay = { animationDelay: `${index * 900}ms` };
  const frameClasses = cn(
    "play-card-appear w-full overflow-hidden rounded-card border-[1.5px] bg-background transition-colors",
    selected ? FRAME_SELECTED : FRAME_UNSELECTED,
  );

  if (videoId) {
    return (
      <div style={appearDelay} className={frameClasses}>
        <YouTubeCard
          videoId={videoId}
          startSeconds={startSeconds}
          className="h-[150px]"
        />
        {/* A dedicated control below the player, not the player itself —
            interacting with the video area must not select the item. */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={t("pick", { name: item.title })}
          className="block w-full text-start"
        >
          <SelectBar title={item.title} index={index} selected={selected} />
        </button>
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <button
        type="button"
        onClick={onSelect}
        style={appearDelay}
        aria-label={t("pick", { name: item.title })}
        className={cn(frameClasses, "text-start")}
      >
        <ImageCard
          src={mediaUrl(item.value)}
          alt={item.title}
          className="h-[150px]"
        />
        <SelectBar title={item.title} index={index} selected={selected} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      style={appearDelay}
      aria-label={t("pick", { name: item.title })}
      className={cn(frameClasses, "text-start")}
    >
      <TextTile item={item} index={index} packCoverTone={packCoverTone} />
      <SelectBar title={item.title} index={index} selected={selected} />
    </button>
  );
}
