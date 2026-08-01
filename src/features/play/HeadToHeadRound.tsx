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
import { toneFor, HAIRLINE_OVERLAY_STYLE } from "@/src/features/play/candidate-tone";
import { VsBadge } from "@/src/features/play/VsBadge";

interface HeadToHeadCardProps {
  item: Item;
  selected: boolean;
  onSelect: () => void;
  /** Precomputed hex from `toneFor` — the text tile's gradient seed. */
  tone: string;
}

// The contender card, straight off the mock's `[data-el="versus"]` side button:
// a padded 20px-radius panel that holds an inset media tile, a centred title,
// and the pick tick — NOT an edge-to-edge media card. This is the SINGLE SOURCE
// for the contender frame; do not fork a second copy elsewhere.
const CARD_FRAME =
  "flex flex-col gap-3 rounded-[20px] border p-4 transition-[transform,border-color,background-color] duration-[180ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-[3px] hover:border-acc/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
// Selection is a border + accent wash (mock), not a ring — a ring sat outside
// the card box and broke the 14px grid gutter between the two sides.
const SELECTED_FRAME = "border-acc/50 bg-acc/[0.08]";
const UNSELECTED_FRAME = "border-border bg-surface-card";

// The media tile is inset inside the card's 16px padding, so it carries its own
// smaller radius. Passed as a className rather than wrapped in an extra div:
// YouTubeCard/ImageCard already own `overflow-hidden` and — critically — their
// own `aspect-video`, which must be left free to derive height from the card's
// width. A fixed height here would beat `aspect-ratio` and letterbox the
// embedded player (see HeadToHeadRound.test.tsx's 16:9 regression guard).
const MEDIA_TILE = "rounded-[11px]";

/** The mock's foot tick: the actual pick control, sitting under the title. */
function PickTick({ selected }: { selected: boolean }) {
  const t = useTranslations("play");
  return (
    <span
      className={cn(
        "flex items-center justify-center gap-2 pt-[2px] text-[12px] font-bold",
        selected ? "text-acc-hover" : "text-foreground/45",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 flex-none items-center justify-center rounded-pill",
          selected ? "bg-acc text-[#07131a]" : "bg-white/[0.07] text-foreground/35",
        )}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      {selected ? t("yourPick") : t("pickThisOne")}
    </span>
  );
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

  let media;
  if (videoId) {
    media = (
      <YouTubeCard
        videoId={videoId}
        startSeconds={startSeconds}
        className={MEDIA_TILE}
      />
    );
  } else if (item.type === "image") {
    media = (
      <ImageCard
        src={mediaUrl(item.value)}
        alt={item.title}
        className={MEDIA_TILE}
      />
    );
  } else {
    media = (
      <div
        className={cn("relative aspect-video overflow-hidden", MEDIA_TILE)}
        style={{
          background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
        }}
      >
        <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
        {/* A youtube item whose id wouldn't parse still says so. */}
        {item.type === "youtube" && (
          <Badge className="absolute end-2 top-2">YouTube</Badge>
        )}
      </div>
    );
  }

  return (
    // The whole card body picks the contender, mirroring the mock, where each
    // side is one big <button>. It can't literally BE a button here: the media
    // slot contains YouTubeCard's own play control, and a button inside a
    // button is invalid HTML. So the card carries the pointer affordance and
    // the tick below stays the real, focusable control — see its comment.
    <div
      data-testid="h2h-contender"
      onClick={onSelect}
      className={cn(
        CARD_FRAME,
        "cursor-pointer",
        selected ? SELECTED_FRAME : UNSELECTED_FRAME,
      )}
    >
      {/* Media + title travel together at the mock's 9px gap; the card's own
          gap-3 (12px) is what separates that pair from the tick below. */}
      <div className="flex flex-col gap-[9px]">
        {/* stopPropagation, not a gap in the click target: engaging the player
            (or scrubbing it) must start the video, never pick the contender
            out from under the viewer. */}
        <div onClick={(event) => event.stopPropagation()}>{media}</div>
        <Text className="text-center text-[17px] font-[650] text-pretty">
          {item.title}
        </Text>
      </div>
      {/* The keyboard/AT path, and the mock's foot tick. `aria-pressed` rather
          than a plain button: this holds a selection until it's confirmed, it
          doesn't act on click. The aria-label deliberately overrides the
          visible "Pick this one" — both sides render that same string, so the
          item name is the only thing telling a screen-reader user which
          contender they're on. e2e/play.spec.ts matches this exact name.
          stopPropagation keeps the card's own handler from double-firing. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        aria-pressed={selected}
        aria-label={t("pick", { name: item.title })}
        // No hover background: the whole card is the click target now, so a
        // separate full-width wash under the tick just read as a stray bar.
        // The mock gives the tick no hover state either.
        className="rounded-[10px]"
      >
        <PickTick selected={selected} />
      </button>
    </div>
  );
}

interface HeadToHeadRoundProps {
  left: Item;
  right: Item;
  /** Id of the contender currently chosen, or null while the round is untouched. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The playing pack's `coverTone` — seeds each contender's text-tile
   * gradient (see `toneFor`). */
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
    // 900px, not Tailwind's `sm`, is the mock's own stacking breakpoint for
    // `[data-el="versus"]` — two 16:9 contenders side by side get unreadably
    // narrow well before 640px.
    <div className="grid grid-cols-1 items-center gap-[14px] min-[900px]:grid-cols-[1fr_auto_1fr]">
      <HeadToHeadCard
        item={left}
        selected={selectedId === left.id}
        onSelect={() => onSelect(left.id)}
        tone={toneFor(coverTone, 0)}
      />
      <VsBadge />
      <HeadToHeadCard
        item={right}
        selected={selectedId === right.id}
        onSelect={() => onSelect(right.id)}
        tone={toneFor(coverTone, 1)}
      />
    </div>
  );
}
