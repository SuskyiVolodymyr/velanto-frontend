"use client";

import Link from "next/link";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";

/**
 * Shown instead of the community breakdown to someone who hasn't finished this
 * pack (velanto-frontend#222). The promise is that stats stay hidden while you
 * play so nobody's picks are swayed by the crowd — before this, the /result URL
 * handed the per-round popular picks to anyone who navigated to it.
 *
 * This is a UX gate, not a security boundary: `GET /packs/:id/results` is a
 * public endpoint by design (the pack's aggregate belongs to the pack), so the
 * numbers are always one request away. What it fixes is the honest journey —
 * a person reading the site can no longer be spoiled by opening a link.
 */
export function ResultLocked({
  packId,
  title,
}: {
  packId: string;
  title: string;
}) {
  const t = useTranslations("result");

  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        {t("label")}
      </Text>
      <Text as="h1" variant="title" className="mb-8 text-3xl">
        {title}
      </Text>

      <Card className="flex flex-col items-center gap-3 py-10 text-center hover:translate-y-0 hover:shadow-none">
        <Text as="h2" className="text-lg font-semibold">
          {t("lockedTitle")}
        </Text>
        <Text variant="secondary" className="max-w-sm">
          {t("lockedBody")}
        </Text>
        <Link
          href={`/packs/${packId}/play`}
          className={buttonClassName("primary", "mt-2 w-fit")}
        >
          {t("lockedCta")}
        </Link>
      </Card>
    </div>
  );
}
