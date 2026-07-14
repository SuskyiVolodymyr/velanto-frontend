"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { Text } from "@/src/shared/components/Text";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
import type { Pack } from "@/src/shared/types/pack";

export function PackCard({
  pack,
  showStatus,
}: {
  pack: Pack;
  showStatus?: boolean;
}) {
  const tFormat = useTranslations("formats");
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
          className="relative isolate flex aspect-[4/3] items-end justify-between p-4"
          style={{
            background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
          }}
        >
          {pack.coverImageKey && (
            <CoverImage coverKey={pack.coverImageKey} className="-z-10" />
          )}
          <Badge variant="overlay">{tFormat(pack.format)}</Badge>
          {showStatusBadge && <StatusBadge kind="pack" status={pack.status} />}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Text className="font-semibold">{pack.title}</Text>
          <Text variant="secondary" className="line-clamp-2 text-sm">
            {pack.description}
          </Text>
          {pack.author && (
            <div className="flex items-center gap-1.5">
              <UserAvatar
                username={pack.author.username}
                avatarKey={pack.author.avatarKey}
                className="h-5 w-5 shrink-0 rounded-full border border-border bg-surface text-[10px] font-semibold text-foreground-secondary"
              />
              <Username
                username={pack.author.username}
                role={pack.author.role}
                trusted={pack.author.trusted}
                at
                className="truncate text-xs text-foreground-secondary"
              />
            </div>
          )}
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
