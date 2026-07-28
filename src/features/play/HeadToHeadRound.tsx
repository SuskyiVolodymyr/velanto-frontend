import { useTranslations } from "next-intl";
import type { Item } from "@/src/shared/types/pack";
import { COVER_TONES } from "@/src/shared/types/pack";
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
  /** Precomputed hex from `toneForOffset` — the text tile's gradient seed. */
  tone: string;
}

// Shared by all three card shapes below, so a selected contender looks the same
// whether it's text, an image, or a video. This is the SINGLE SOURCE for the
// contender selection frame (mirrors the mock's card border + selection ring)
// — do not fork a second copy of this styling elsewhere.
const SELECTED_FRAME = "border-acc ring-[3px] ring-acc/30";
const UNSELECTED_FRAME = "border-border";
const CARD_FRAME =
  "flex flex-col overflow-hidden rounded-card border-2 bg-background transition-colors";

// The diagonal hairline overlay on a text tile's gradient background — the
// mock's texture for a candidate with no image/video of its own.
const HAIRLINE_OVERLAY_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(122deg, rgba(255,255,255,.03) 0 1px, transparent 1px 15px)",
};

const LABEL_CLASS = "p-[18px] text-center text-[18px] font-semibold";

/**
 * Derives a text tile's gradient tone deterministically from `COVER_TONES`,
 * seeded off the pack's own `coverTone` index so a pack's tiles stay within
 * its own palette family, then offset by the contender's position (left = 0,
 * right = 1) so the two sides don't share a tone.
 */
function toneForOffset(coverTone: string, offset: number): string {
  const seedIndex = COVER_TONES.indexOf(
    coverTone as (typeof COVER_TONES)[number],
  );
  const base = seedIndex === -1 ? 0 : seedIndex;
  return COVER_TONES[(base + offset) % COVER_TONES.length];
}

function HeadToHeadCard({
  item,
  selected,
  onSelect,
  tone,
}: HeadToHeadCardProps) {
  const t = useTranslations("play");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  // `aria-pressed` rather than a plain button: these are now toggles that hold
  // a selection until it's confirmed, not controls that act on click.
  const pressed = { "aria-pressed": selected } as const;
  const frameClass = cn(CARD_FRAME, selected ? SELECTED_FRAME : UNSELECTED_FRAME);

  if (videoId) {
    return (
      <div className={frameClass}>
        <YouTubeCard
          videoId={videoId}
          startSeconds={startSeconds}
          className="h-[230px] w-full"
        />
        <button
          type="button"
          onClick={onSelect}
          {...pressed}
          aria-label={t("pick", { name: item.title })}
          className={cn(LABEL_CLASS, "transition-colors hover:bg-white/[0.04]")}
        >
          <Text className="font-semibold">{item.title}</Text>
        </button>
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <div className={frameClass}>
        <ImageCard
          src={mediaUrl(item.value)}
          alt={item.title}
          className="h-[230px] w-full"
        />
        <button
          type="button"
          onClick={onSelect}
          {...pressed}
          aria-label={t("pick", { name: item.title })}
          className={cn(LABEL_CLASS, "transition-colors hover:bg-white/[0.04]")}
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
      className={frameClass}
    >
      <div
        className="relative h-[230px]"
        style={{
          background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
        }}
      >
        <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
      </div>
      <div className={LABEL_CLASS}>
        {item.type === "youtube" && <Badge className="mb-2">YouTube</Badge>}
        <Text className="font-semibold">{item.title}</Text>
      </div>
    </button>
  );
}

interface HeadToHeadRoundProps {
  left: Item;
  right: Item;
  /** Id of the contender currently chosen, or null while the round is untouched. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The playing pack's `coverTone` — seeds each contender's text-tile
   * gradient (see `toneForOffset`). */
  coverTone: string;
}

export function HeadToHeadRound({
  left,
  right,
  selectedId,
  onSelect,
  coverTone,
}: HeadToHeadRoundProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-[22px] sm:grid-cols-[1fr_auto_1fr]">
      <HeadToHeadCard
        item={left}
        selected={selectedId === left.id}
        onSelect={() => onSelect(left.id)}
        tone={toneForOffset(coverTone, 0)}
      />
      {/* Exactly one "VS" may appear on the play screen (e2e strict-mode
          query) — this is the only place this format renders that string. */}
      <Text
        as="span"
        variant="secondary"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-pill border border-border bg-white/[0.04] text-xs font-semibold"
      >
        VS
      </Text>
      <HeadToHeadCard
        item={right}
        selected={selectedId === right.id}
        onSelect={() => onSelect(right.id)}
        tone={toneForOffset(coverTone, 1)}
      />
    </div>
  );
}
