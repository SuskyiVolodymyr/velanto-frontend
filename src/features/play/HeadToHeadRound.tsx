import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";

interface HeadToHeadCardProps {
  item: Item;
  onPick: () => void;
}

function HeadToHeadCard({ item, onPick }: HeadToHeadCardProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Pick ${item.title}`}
      className="flex flex-1 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-border-strong"
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
