import { Text } from "@/src/shared/components/Text";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-border bg-white/[0.02] p-[22px]">
      {children}
    </div>
  );
}

function StatRow({
  name,
  label,
  pct,
}: {
  name: string;
  label: string;
  pct?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 flex-none text-[13px] text-foreground-secondary">
        {name}
      </span>
      <span className="flex-1 text-[13.5px]">{label}</span>
      {pct !== undefined && (
        <div className="hidden h-1.5 w-28 flex-none overflow-hidden rounded-full bg-white/[0.06] sm:block">
          <div
            className="h-full rounded-full bg-acc"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PackStats({ results }: { results: PackResults | RankResults }) {
  if (results.totalPlays === 0) {
    return (
      <Panel>
        <Text variant="secondary">No plays yet — be the first!</Text>
      </Panel>
    );
  }

  const playsLabel = `${results.totalPlays} play${results.totalPlays === 1 ? "" : "s"}`;

  if (results.format === "rank_blind") {
    return (
      <Panel>
        <Text variant="tertiary" className="mb-3 text-sm">
          {playsLabel}
        </Text>
        <div className="flex flex-col gap-3">
          {results.rounds.map((round) => {
            if (round.items.length === 0) return null;
            const topItem = round.items.reduce((top, item) =>
              top.averagePosition <= item.averagePosition ? top : item,
            );
            return (
              <StatRow
                key={round.groupId}
                name={round.groupName}
                label={`${topItem.itemTitle} — avg ${topItem.averagePosition}`}
              />
            );
          })}
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <Text variant="tertiary" className="mb-3 text-sm">
        {playsLabel}
      </Text>
      <div className="flex flex-col gap-3">
        {results.rounds.map((round) => {
          if (round.items.length === 0) return null;
          const topItem = round.items.reduce((top, item) =>
            top.percentage >= item.percentage ? top : item,
          );
          return (
            <StatRow
              key={round.groupId}
              name={round.groupName}
              label={`${topItem.itemTitle} — ${topItem.percentage}%`}
              pct={topItem.percentage}
            />
          );
        })}
      </div>
    </Panel>
  );
}
