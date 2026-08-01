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
import { CHOSEN_LABEL_KEY } from "@/src/features/play/play-format-copy";
import type { Item, Pack } from "@/src/shared/types/pack";

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
  /** Picks which "chosen" badge text shows once selected — save_one/nxn say
   * "Saved", sacrifice_one says "Sacrificed" (see `CHOSEN_LABEL_KEY`). */
  format: Pack["format"];
}

const FRAME_SELECTED = "border-acc ring-[3px] ring-acc/30";
const FRAME_UNSELECTED = "border-border hover:border-border-strong";

/** The title + index + checkbox row shared by all three media treatments.
 * The checkbox/indicator sits on the RIGHT of the title (mock's `i.mark`,
 * which uses `margin-left:auto`) — moved from its original left-of-title
 * spot (T3). */
function SelectBar({
  title,
  index,
  selected,
  className,
}: {
  title: string;
  index: number;
  selected: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[11px] border-t border-border p-[13px_14px]",
        selected ? "bg-acc/[0.12]" : "bg-white/[0.02]",
        className,
      )}
    >
      {/* min-h reserves a full 2-line slot regardless of the actual title's
          line count, so a card's title container is the same height whether
          its neighbor's title wraps to one line or two. */}
      <Text className="line-clamp-2 min-h-[2.6em] flex-1 text-[14.5px] font-semibold leading-[1.3]">
        {title}
      </Text>
      <Text variant="tertiary" className="text-[11px]">
        {String(index + 1).padStart(2, "0")}
      </Text>
      <span
        aria-hidden
        className={cn(
          "ms-auto flex h-[19px] w-[19px] flex-none items-center justify-center rounded-chip border-[1.5px]",
          selected ? "border-acc bg-acc" : "border-border-strong",
        )}
      >
        {selected && (
          <span className="mb-[2px] h-[7px] w-[4px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#07131a]" />
        )}
      </span>
    </div>
  );
}

/** The top-left "chosen" pill overlaid on a card's cover once selected. */
function ChosenBadge({ label }: { label: string }) {
  return (
    <Badge variant="accent" className="absolute start-2 top-2 z-10">
      {label}
    </Badge>
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
  selected,
  chosenLabel,
}: {
  item: Item;
  index: number;
  packCoverTone: string;
  selected: boolean;
  chosenLabel: string;
}) {
  const tone = toneFor(packCoverTone, index);
  return (
    <div
      // 16:9, not a fixed height. The mock gives EVERY candidate tile
      // `aspect-ratio:16/9` — including this gradient one — and both media
      // treatments beside it (ImageCard, YouTubeCard) are `aspect-video`
      // already. A fixed 150px made a text candidate visibly shorter than an
      // image candidate at the same card width, and shorter still than the
      // mock, in any round that mixes item types.
      className="relative aspect-video overflow-hidden"
      style={{
        background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
      }}
    >
      <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
      {selected ? (
        <ChosenBadge label={chosenLabel} />
      ) : (
        <Text
          variant="tertiary"
          className="absolute start-2 top-2 text-[11px] font-semibold"
        >
          {String(index + 1).padStart(2, "0")}
        </Text>
      )}
      {item.type === "youtube" && !selected && (
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
  format,
}: CandidateCardProps) {
  const t = useTranslations("play");
  const chosenLabel = t(CHOSEN_LABEL_KEY[format]);
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;
  // Cards grow in one-by-one, 900ms apart, staggered by position — the
  // deliberate "the stagger IS the reveal" mechanic (see the 2.0.0 redesign
  // plan's D1). Keep this exact per-index delay if the frame markup changes.
  const appearDelay = { animationDelay: `${index * 900}ms` };
  // flex-col + h-full: a grid row stretches every card to the tallest card's
  // height (e.g. a neighbor with a 2-line title); without this the extra
  // height just sat as blank space below the SelectBar instead of the title
  // row hugging the card's bottom edge.
  const frameClasses = cn(
    "play-card-appear flex h-full w-full flex-col overflow-hidden rounded-card border-[1.5px] bg-background transition-colors",
    selected ? FRAME_SELECTED : FRAME_UNSELECTED,
  );

  if (videoId) {
    return (
      <div style={appearDelay} className={frameClasses}>
        <div className="relative">
          {/* No fixed height here (unlike the other two media treatments):
              YouTubeCard's own `aspect-video` needs an auto width to compute
              a matching 16:9 height from — a fixed height instead forced an
              aspect-ratio-derived width narrower than the card, leaving the
              embedded player (and its native controls/progress bar) short of
              the card's full width. */}
          <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
          {selected && <ChosenBadge label={chosenLabel} />}
        </div>
        {/* A dedicated control below the player, not the player itself —
            interacting with the video area must not select the item.
            mt-auto pins it to the card's bottom edge (see frameClasses). */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={t("pick", { name: item.title })}
          className="mt-auto block w-full text-start"
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
        <div className="relative">
          {/* Same reasoning as the video branch above: let aspect-video size
              from the card's full width instead of a fixed height. */}
          <ImageCard src={mediaUrl(item.value)} alt={item.title} />
          {selected && <ChosenBadge label={chosenLabel} />}
        </div>
        <SelectBar
          title={item.title}
          index={index}
          selected={selected}
          className="mt-auto"
        />
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
      <TextTile
        item={item}
        index={index}
        packCoverTone={packCoverTone}
        selected={selected}
        chosenLabel={chosenLabel}
      />
      <SelectBar
        title={item.title}
        index={index}
        selected={selected}
        className="mt-auto"
      />
    </button>
  );
}
