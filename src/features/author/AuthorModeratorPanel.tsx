"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import {
  BanReasonPicker,
  isBanReasonValid,
} from "@/src/shared/components/BanReasonPicker";
import { resolveBanReasonTitle } from "@/src/shared/lib/ban-reason-title";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  BanHistoryPage,
  BanDuration,
} from "@/src/shared/lib/users-client";
import type { RuleCategory } from "@/src/shared/types/rules";
import type { AuthorModeration } from "./use-author-moderation";

/**
 * Moderator-only block on the author screen: the inline ban form (duration +
 * shared {@link BanReasonPicker}) and the ban-history list, whose reason ids are
 * resolved to human titles via {@link resolveBanReasonTitle}. Rendered only when
 * a moderator-plus viewer is on someone else's page — the gating stays with the
 * screen so this component just renders what it's handed.
 */
export function AuthorModeratorPanel({
  authorId,
  moderation,
  banHistoryQuery,
  ruleCategories,
}: {
  authorId: string;
  moderation: AuthorModeration;
  banHistoryQuery: UseQueryResult<BanHistoryPage>;
  ruleCategories: RuleCategory[];
}) {
  const tBanReason = useTranslations("banReason");
  const {
    showBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banActionError,
    bannedUntil,
    toggleBanForm,
    handleBanSubmit,
  } = moderation;

  return (
    <div className="mb-10 rounded-[15px] border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <Text as="h2" variant="title" className="text-lg">
          Moderation
        </Text>
        {!bannedUntil && (
          <Button variant="secondary" onClick={toggleBanForm}>
            Ban
          </Button>
        )}
      </div>
      {bannedUntil && (
        <Text variant="secondary" className="mb-3 text-sm">
          Banned until {new Date(bannedUntil).toLocaleDateString()}.
        </Text>
      )}
      {showBanForm && (
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-start gap-3">
            <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
              Duration
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value as BanDuration)}
                aria-label="Ban duration"
                className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
              >
                {BAN_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-[16rem] max-w-sm flex-1">
              <BanReasonPicker
                idPrefix={authorId}
                value={banReason}
                onChange={setBanReason}
              />
            </div>
          </div>
          <Button
            variant="primary"
            className="self-start"
            disabled={!isBanReasonValid(banReason)}
            onClick={() => void handleBanSubmit()}
          >
            Confirm ban
          </Button>
          {banActionError && (
            <Text className="text-xs text-danger">{banActionError}</Text>
          )}
        </div>
      )}
      {banHistoryQuery.isLoading && (
        <Text variant="secondary">Loading ban history…</Text>
      )}
      {banHistoryQuery.error && (
        <Text className="text-sm text-danger">
          Couldn&apos;t load ban history.
        </Text>
      )}
      {banHistoryQuery.data && banHistoryQuery.data.items.length === 0 && (
        <Text variant="secondary">No ban history for this user.</Text>
      )}
      {banHistoryQuery.data && banHistoryQuery.data.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {banHistoryQuery.data.items.map((entry, i) => (
            <div key={i} className="text-sm">
              <Text variant="tertiary" className="text-xs">
                {new Date(entry.createdAt).toLocaleString()}
              </Text>
              <Text>
                <span className="font-semibold">{entry.actorUsername}</span> ·{" "}
                {entry.meta.duration} ·{" "}
                <span className="text-foreground-secondary">
                  {resolveBanReasonTitle(
                    entry.meta.reason,
                    ruleCategories,
                    tBanReason("other"),
                  ) ?? entry.meta.reason}
                </span>
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
