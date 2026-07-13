import { useTranslations } from "next-intl";
import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { cn } from "@/src/shared/lib/cn";

interface VersusSide {
  id: string;
  name: string;
  items: Item[];
}

interface SideCardProps {
  side: VersusSide;
  selected: boolean;
  onSelect: () => void;
}

function SideCard({ side, selected, onSelect }: SideCardProps) {
  const t = useTranslations("play");
  return (
    <div
      role="button"
      tabIndex={0}
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
        "flex flex-1 cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-acc bg-acc/10"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <Text className="text-center font-semibold">{side.name}</Text>
      <div className="flex flex-col gap-2">
        {side.items.map((item, index) => {
          const videoId =
            item.type === "youtube" ? extractYouTubeId(item.value) : null;
          // Cards fade in one-by-one; the delay staggers by position.
          const appearDelay = { animationDelay: `${index * 80}ms` };

          if (videoId) {
            return (
              <div
                key={item.id}
                style={appearDelay}
                className="play-card-appear overflow-hidden rounded-xl border border-border bg-white/[0.03]"
              >
                <YouTubeCard videoId={videoId} />
                <Text className="p-3 text-sm font-medium">{item.title}</Text>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              style={appearDelay}
              className="play-card-appear rounded-xl border border-border bg-white/[0.03] p-3"
            >
              {item.type === "youtube" && (
                <Badge className="mb-2">YouTube</Badge>
              )}
              <Text className="text-sm font-medium">{item.title}</Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface VersusRoundProps {
  sideA: VersusSide;
  sideB: VersusSide;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VersusRound({
  sideA,
  sideB,
  selectedId,
  onSelect,
}: VersusRoundProps) {
  return (
    <div className="flex items-start gap-4">
      <SideCard
        side={sideA}
        selected={selectedId === sideA.id}
        onSelect={() => onSelect(sideA.id)}
      />
      <div className="flex items-center justify-center pt-14">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
          VS
        </span>
      </div>
      <SideCard
        side={sideB}
        selected={selectedId === sideB.id}
        onSelect={() => onSelect(sideB.id)}
      />
    </div>
  );
}
