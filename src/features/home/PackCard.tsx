import Link from "next/link";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { Text } from "@/src/shared/components/Text";
import { FORMAT_LABELS, getRoundsCount } from "@/src/shared/lib/pack-display";
import type { Pack } from "@/src/shared/types/pack";

export function PackCard({
  pack,
  showStatus,
}: {
  pack: Pack;
  showStatus?: boolean;
}) {
  const roundsCount = getRoundsCount(pack);
  const statsLabel =
    pack.totalPlays === 0
      ? "No plays yet"
      : `${pack.totalPlays} play${pack.totalPlays === 1 ? "" : "s"} · ${Math.round(pack.avgAgreementPercent)}% agreement`;
  const showStatusBadge = showStatus && pack.status !== "approved";

  return (
    <Link href={`/packs/${pack.id}`} className="block">
      <div className="flex h-full flex-col overflow-hidden rounded-[15px] border border-border bg-surface transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.42)]">
        <div
          className="flex aspect-[4/3] items-end justify-between p-4"
          style={{
            background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
          }}
        >
          <Badge>{FORMAT_LABELS[pack.format]}</Badge>
          {showStatusBadge && <StatusBadge kind="pack" status={pack.status} />}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Text className="font-semibold">{pack.title}</Text>
          <Text variant="secondary" className="line-clamp-2 text-sm">
            {pack.description}
          </Text>
          <div className="mt-auto flex items-center justify-between gap-2">
            <Text variant="tertiary" className="shrink-0 text-xs">
              {roundsCount} round{roundsCount === 1 ? "" : "s"}
            </Text>
            <Text variant="tertiary" className="truncate text-xs">
              {statsLabel}
            </Text>
          </div>
        </div>
      </div>
    </Link>
  );
}
