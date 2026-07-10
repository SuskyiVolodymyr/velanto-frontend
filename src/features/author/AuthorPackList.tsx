"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { PackCard } from "@/src/features/home/PackCard";
import type { Pack } from "@/src/shared/types/pack";

/** The author's approved packs as a responsive grid, or an empty-state line. */
export function AuthorPackList({ packs }: { packs: Pack[] }) {
  const t = useTranslations("profile");
  return (
    <>
      <Text as="h2" variant="title" className="mb-4 text-lg">
        {t("packs")}
      </Text>
      {packs.length === 0 ? (
        <Text variant="secondary">{t("noPacks")}</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </>
  );
}
