import { Badge } from "@/src/shared/components/Badge";
import { Text } from "@/src/shared/components/Text";
import { FORMAT_LABELS, getRoundsCount } from "@/src/shared/lib/pack-display";
import type { Pack } from "@/src/shared/types/pack";

export function PackCoverBanner({ pack }: { pack: Pack }) {
  const roundsCount = getRoundsCount(pack);

  return (
    <div
      className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-border p-5"
      style={{ background: `linear-gradient(158deg, ${pack.coverTone}, var(--background) 78%)` }}
    >
      <div className="flex items-start justify-between">
        <Badge>{FORMAT_LABELS[pack.format]}</Badge>
        <Text variant="secondary" className="text-xs">
          {roundsCount} round{roundsCount === 1 ? "" : "s"}
        </Text>
      </div>
      <Text as="h1" variant="title" className="text-3xl text-white drop-shadow-sm">
        {pack.title}
      </Text>
    </div>
  );
}
