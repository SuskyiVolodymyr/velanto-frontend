"use client";

import Link from "next/link";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { useTranslations } from "next-intl";
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
    <div className={cn(pageContainer(1240), "flex-1 py-10")}>
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        {t("label")}
      </Text>
      <Text as="h1" variant="title" className="mb-8 text-3xl">
        {title}
      </Text>

      {/* Same panel recipe as ResultAgainPanel (T11): rounded-card +
          border-border + bg-surface-card + p-[26px_24px], built as a raw div
          rather than <Card> so this arbitrary padding doesn't collide with
          Card's own baked-in p-[18px] (cn() is a plain join, not
          tailwind-merge — see Text.tsx / EliminationResultScreen.tsx). */}
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface-card p-[26px_24px] text-center">
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
      </div>
    </div>
  );
}
