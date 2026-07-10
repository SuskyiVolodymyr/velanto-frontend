import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import type { Pick } from "@/src/features/play/use-play-session";

interface PicksSummaryProps {
  label: string;
  picks: Pick[];
}

export function PicksSummary({ label, picks }: PicksSummaryProps) {
  return (
    <section>
      <Text variant="tertiary" className="mb-3 text-xs uppercase tracking-wide">
        {label}
      </Text>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick, index) => (
          <Badge key={`${pick.groupId}-${index}`}>{pick.itemTitle}</Badge>
        ))}
      </div>
    </section>
  );
}
