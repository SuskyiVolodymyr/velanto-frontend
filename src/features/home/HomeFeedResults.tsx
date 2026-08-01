"use client";

import { useTranslations } from "next-intl";
import type { PackSummary } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { PackCard } from "@/src/features/home/PackCard";
import {
  PACK_GRID_CLASS,
  PackGridSkeleton,
} from "@/src/features/home/PackGridSkeleton";

export function HomeFeedResults({
  status,
  packs,
}: {
  status: "loading" | "ready" | "error";
  packs: PackSummary[];
}) {
  const t = useTranslations("home");

  if (status === "loading") return <PackGridSkeleton label={t("loading")} />;
  if (status === "error") {
    return <Text variant="danger">{t("error")}</Text>;
  }
  if (packs.length === 0) {
    return <Text variant="secondary">{t("empty")}</Text>;
  }
  return (
    <div className={PACK_GRID_CLASS}>
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
