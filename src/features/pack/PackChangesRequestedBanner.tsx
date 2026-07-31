"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PencilLine } from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The pack page's second entry point into the review outcome (the first is the
 * `pack_changes_requested` notification).
 *
 * The author is the only person who can act on a change request and the only
 * person who can see the pack at all in this state, so this is author-only and
 * `changes_requested`-only — the same gating discipline as its sibling
 * {@link PackRejectionReason}. The moderator's full message and the marked
 * items live on the outcome page rather than here: a pack page that opened
 * with a list of demands would bury the pack itself.
 */
export function PackChangesRequestedBanner({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const { user } = useAuth();

  if (
    !user ||
    user.id !== pack.authorId ||
    pack.status !== "changes_requested"
  ) {
    return null;
  }

  const markCount = pack.changeRequest?.marks.length ?? 0;

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-tile border border-status-pending/30 bg-status-pending/[0.06] px-4 py-3.5">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-chip bg-status-pending/[0.16] text-status-pending">
        <PencilLine size={17} strokeWidth={2.1} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text as="h2" className="text-sm font-bold">
          {t("changesRequestedHeading")}
        </Text>
        <Text variant="tertiary" className="text-[12.5px]">
          {markCount > 0
            ? t("changesRequestedMarks", { count: markCount })
            : t("changesRequestedNoMarks")}
        </Text>
      </div>
      <Link
        href={`/packs/${pack.id}/review`}
        className="ms-auto flex h-[38px] items-center rounded-control bg-acc px-4 text-[13px] font-[650] text-[#07131a] transition-[filter] hover:brightness-110"
      >
        {t("changesRequestedCta")}
      </Link>
    </section>
  );
}
