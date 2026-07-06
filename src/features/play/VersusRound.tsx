import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { cn } from "@/src/shared/lib/cn";

interface VersusSide {
  id: string;
  name: string;
  items: Item[];
}

interface SideCardProps {
  side: VersusSide;
  revealedCount: number;
  selected: boolean;
  onSelect: () => void;
}

function SideCard({ side, revealedCount, selected, onSelect }: SideCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Pick ${side.name}`}
      className={cn(
        "flex flex-1 flex-col gap-3 rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-acc bg-acc/10" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <Text className="text-center font-semibold">{side.name}</Text>
      <div className="flex flex-col gap-2">
        {side.items.slice(0, revealedCount).map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-white/[0.03] p-3">
            {item.type === "youtube" && <Badge className="mb-2">YouTube</Badge>}
            <Text className="text-sm font-medium">{item.title}</Text>
          </div>
        ))}
      </div>
    </button>
  );
}

interface VersusRoundProps {
  sideA: VersusSide;
  sideB: VersusSide;
  revealedCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VersusRound({ sideA, sideB, revealedCount, selectedId, onSelect }: VersusRoundProps) {
  return (
    <div className="flex items-start gap-4">
      <SideCard
        side={sideA}
        revealedCount={revealedCount}
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
        revealedCount={revealedCount}
        selected={selectedId === sideB.id}
        onSelect={() => onSelect(sideB.id)}
      />
    </div>
  );
}
