import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import type { PackResults } from "@/src/shared/types/play-results";

export function PackStats({ results }: { results: PackResults }) {
  if (results.totalPlays === 0) {
    return <Text variant="secondary">No plays yet — be the first!</Text>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="secondary" className="text-sm">
        {results.totalPlays} play{results.totalPlays === 1 ? "" : "s"}
      </Text>
      <div className="flex flex-col gap-2">
        {results.rounds.map((round) => {
          if (round.items.length === 0) return null;
          const topItem = round.items.reduce((top, item) =>
            top.percentage >= item.percentage ? top : item,
          );
          return (
            <Card key={round.groupId} className="hover:translate-y-0 hover:shadow-none">
              <div className="flex items-center justify-between gap-2">
                <Text variant="secondary" className="text-sm">
                  {round.groupName}
                </Text>
                <Text className="text-sm font-medium">
                  {topItem.itemTitle} — {topItem.percentage}%
                </Text>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
