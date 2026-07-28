"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import type { PackStatus } from "@/src/shared/types/pack";

/**
 * Surfaces WHY a pack was rejected to its author — the one piece of "pack
 * review outcome" this app can build without a mock (see
 * docs/superpowers/plans/2026-07-29-feedback-cluster-redesign-plan.md, D2).
 * `Pack.rejectionReason` is populated by a moderator's reject flow
 * (`packsClient.reject(id, reason)`, `src/features/moderation/PackReviewScreen.tsx`)
 * but was never rendered anywhere before this. Author-only, rejected-only,
 * and only when a reason was actually given — silent otherwise, same gating
 * discipline as the sibling {@link PackOwnerStatusBadge}.
 */
export function PackRejectionReason({
  packAuthorId,
  status,
  rejectionReason,
}: {
  packAuthorId: string;
  status: PackStatus;
  rejectionReason: string | null;
}) {
  const t = useTranslations("pack");
  const { user } = useAuth();
  if (
    !user ||
    user.id !== packAuthorId ||
    status !== "rejected" ||
    !rejectionReason
  ) {
    return null;
  }
  return (
    <Card className="flex flex-col gap-1.5">
      <Text
        as="h2"
        variant="tertiary"
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        {t("rejectionReasonHeading")}
      </Text>
      <Text variant="secondary" className="whitespace-pre-wrap text-sm">
        {rejectionReason}
      </Text>
    </Card>
  );
}
