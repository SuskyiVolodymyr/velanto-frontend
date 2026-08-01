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
import {
  toneFor,
  HAIRLINE_OVERLAY_STYLE,
} from "@/src/features/play/candidate-tone";
import { VsBadge } from "@/src/features/play/VsBadge";

interface VersusSide {
  name: string;
  items: Item[];
}

// The mock's item tile is media + a centred caption, nothing else — no
// tile-level border or background. Matches the same inset-media treatment
// used for HeadToHeadRound's contenders (that component's MEDIA_TILE).
const MEDIA_TILE = "rounded-[11px]";

/** One drawn item within a side panel — media band + centred title, no
 * selection of its own (the whole side is the pick target). */
function ItemTile({
  item,
  index,
  packCoverTone,
}: {
  item: Item;
  index: number;
  packCoverTone: string;
}) {
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;
  // Cards grow in one-by-one, staggered by position — the D1 "stagger IS the
  // reveal" mechanic, kept from the pre-restyle version of this component.
  const appearDelay = { animationDelay: `${index * 900}ms` };

  let media;
  if (videoId) {
    // No fixed height: aspect-video needs an auto width to size a matching
    // 16:9 height from — see HeadToHeadRound's identical fix/regression test.
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
    const tone = toneFor(packCoverTone, index);
    media = (
      <div
        className={cn("relative aspect-video overflow-hidden", MEDIA_TILE)}
        style={{
          background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={HAIRLINE_OVERLAY_STYLE}
        />
        {item.type === "youtube" && (
          <Badge className="absolute end-2 top-2">YouTube</Badge>
        )}
      </div>
    );
  }

  return (
    <div
      style={appearDelay}
      className="play-card-appear flex flex-col gap-[9px]"
    >
      {media}
      <Text className="text-center text-[13.5px] font-[650] text-pretty">
        {item.title}
      </Text>
    </div>
  );
}

interface SideCardProps {
  side: VersusSide;
  selected: boolean;
  onSelect: () => void;
  packCoverTone: string;
}

function SideCard({ side, selected, onSelect, packCoverTone }: SideCardProps) {
  const t = useTranslations("play");
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        // A youtube item's own play button lives inside this div and is
        // independently focusable. Keydown bubbles regardless of which
        // descendant has focus, so without this check, activating that
        // button via the keyboard would also select the side — unlike a
        // mouse click, which the button already stops from propagating.
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onSelect();
      }}
      aria-label={t("pick", { name: side.name })}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col gap-3 rounded-[20px] border p-4 text-start transition-colors",
        selected
          ? "border-acc/50 bg-acc/[0.08]"
          : "border-border bg-surface-card hover:border-border-strong",
      )}
    >
      {/* The label row: pool/side name, faded unless selected, with a
          trailing check pushed to the far end (mock's margin-left:auto) once
          chosen — this and the panel wash above are the ONLY selected
          signals now; the mock's nxn side has no separate footer row (that
          belongs to 1v1 alone — see HeadToHeadRound's PickTick) and no A/B
          letter badge (the two sides are already disambiguated by name
          upstream — PlayScreen substitutes "Side A"/"Side B" for a
          single-pool round before either side name reaches this component). */}
      <div className="flex items-center gap-[9px]">
        <Text
          className={cn(
            "truncate text-[11.5px] font-bold uppercase tracking-[0.1em]",
            selected ? "text-acc-hover" : "text-foreground/45",
          )}
        >
          {side.name}
        </Text>
        {selected && (
          <span
            aria-hidden="true"
            className="ms-auto flex h-[22px] w-[22px] flex-none items-center justify-center rounded-pill bg-acc text-[#07131a]"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
      </div>
      {/* auto-fit rather than a fixed column count equal to the item count:
          nxn allows up to 8 items per side (create-pack.value-schemas.ts),
          and 8 equal-width columns squeezed every tile down to a sliver.
          auto-fit instead wraps onto more rows, keeping each tile at a
          legible minimum width regardless of N.

          Below 720px (this feature's established mobile threshold — see
          PlayChrome/PlayRoundHeader's own max-[720px] rules), auto-fit still
          fits 2-up at ~110px each, too cramped for a video's controls to be
          usable — force a single column instead. `!` is required: the
          override has to beat the inline style's grid-template-columns,
          which otherwise wins on specificity over a plain utility class. */}
      <div
        className="grid gap-3 max-[720px]:!grid-cols-1"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        }}
      >
        {side.items.map((item, index) => (
          <ItemTile
            key={item.id}
            item={item}
            index={index}
            packCoverTone={packCoverTone}
          />
        ))}
      </div>
    </div>
  );
}

interface VersusRoundProps {
  sideA: VersusSide;
  sideB: VersusSide;
  // The chosen side's slot index (0 = A, 1 = B), or null. Selection is by
  // POSITION, not group id, so a single-pool round's two sides stay distinct.
  selectedSide: number | null;
  onSelect: (side: number) => void;
  /** The playing pack's `coverTone` — seeds each item tile's text-tile gradient. */
  packCoverTone: string;
}

export function VersusRound({
  sideA,
  sideB,
  selectedSide,
  onSelect,
  packCoverTone,
}: VersusRoundProps) {
  return (
    // Single column, the two sides stacked with VS between — the mock's
    // versusCols is "1fr" for nxn (only 1v1 gets the 3-column "1fr auto 1fr"
    // row), since a side can hold up to 8 items and needs the full content
    // width, not half of it.
    <div className="grid grid-cols-1 gap-[14px]">
      <SideCard
        side={sideA}
        selected={selectedSide === 0}
        onSelect={() => onSelect(0)}
        packCoverTone={packCoverTone}
      />
      <VsBadge />
      <SideCard
        side={sideB}
        selected={selectedSide === 1}
        onSelect={() => onSelect(1)}
        packCoverTone={packCoverTone}
      />
    </div>
  );
}
