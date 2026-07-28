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

interface VersusSide {
  name: string;
  items: Item[];
}

/** One drawn item within a side panel — media band + label, no selection of its own. */
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
  const frameClasses =
    "play-card-appear overflow-hidden rounded-tile border border-border bg-background";

  if (videoId) {
    return (
      <div style={appearDelay} className={frameClasses}>
        <YouTubeCard
          videoId={videoId}
          startSeconds={startSeconds}
          className="h-[110px]"
        />
        <Text className="p-[11px_13px] text-[13.5px] font-semibold">
          {item.title}
        </Text>
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <div style={appearDelay} className={frameClasses}>
        <ImageCard
          src={mediaUrl(item.value)}
          alt={item.title}
          className="h-[110px]"
        />
        <Text className="p-[11px_13px] text-[13.5px] font-semibold">
          {item.title}
        </Text>
      </div>
    );
  }

  const tone = toneFor(packCoverTone, index);
  return (
    <div style={appearDelay} className={frameClasses}>
      <div
        className="relative h-[110px]"
        style={{
          background: `linear-gradient(158deg, ${tone}, var(--background) 78%)`,
        }}
      >
        <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
        {item.type === "youtube" && (
          <Badge className="absolute end-2 top-2">YouTube</Badge>
        )}
      </div>
      <Text className="p-[11px_13px] text-[13.5px] font-semibold">
        {item.title}
      </Text>
    </div>
  );
}

interface SideCardProps {
  side: VersusSide;
  /** Derived from the slot's INDEX (0 → "A", 1 → "B"), never from `side.name` —
   * pool names are arbitrary author-chosen strings, not always A/B-shaped. */
  letter: "A" | "B";
  selected: boolean;
  onSelect: () => void;
  packCoverTone: string;
}

function SideCard({ side, letter, selected, onSelect, packCoverTone }: SideCardProps) {
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
        "flex min-w-0 flex-1 cursor-pointer flex-col gap-3 rounded-card border-2 p-4 text-start transition-colors",
        selected
          ? "border-acc bg-acc/[0.08] ring-[3px] ring-acc/[0.22]"
          : "border-border bg-white/[0.015] hover:border-border-strong",
      )}
    >
      <div className="flex items-center justify-center gap-[9px]">
        <span
          aria-hidden
          className="flex h-5 w-5 flex-none items-center justify-center rounded-chip bg-acc text-[11px] font-semibold text-[#07131a]"
        >
          {letter}
        </span>
        <Text className="text-[14.5px] font-semibold">{side.name}</Text>
        {selected && (
          <span
            aria-hidden
            className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-acc"
          >
            <span className="-mt-[2px] h-[4.5px] w-[8px] -rotate-45 border-b-2 border-l-2 border-[#07131a]" />
          </span>
        )}
      </div>
      {side.items.map((item, index) => (
        <ItemTile
          key={item.id}
          item={item}
          index={index}
          packCoverTone={packCoverTone}
        />
      ))}
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
    <div className="grid grid-cols-1 items-start gap-[22px] sm:grid-cols-[1fr_auto_1fr]">
      <SideCard
        side={sideA}
        letter="A"
        selected={selectedSide === 0}
        onSelect={() => onSelect(0)}
        packCoverTone={packCoverTone}
      />
      {/* Exactly one "VS" may appear on the play screen (e2e strict-mode
          query) — this is the only place nxn renders that string. */}
      <div className="flex justify-center pt-[60px]">
        <Text
          as="span"
          variant="secondary"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-pill border border-border bg-white/[0.04] text-xs font-semibold"
        >
          VS
        </Text>
      </div>
      <SideCard
        side={sideB}
        letter="B"
        selected={selectedSide === 1}
        onSelect={() => onSelect(1)}
        packCoverTone={packCoverTone}
      />
    </div>
  );
}
