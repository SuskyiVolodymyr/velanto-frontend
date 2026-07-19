"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/src/shared/components/Modal";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { cn } from "@/src/shared/lib/cn";
import { useFollowList, type FollowListKind } from "./api/follow-list.queries";
import { FollowUserRow } from "./FollowUserRow";

const TABS: FollowListKind[] = ["followers", "following"];

/**
 * The followers / following list for a profile, in a modal with two tabs.
 * Mounted only while open (the parent conditionally renders it), so the active
 * tab resets to `initialTab` on each open and closed tabs don't fetch.
 */
export function FollowListModal({
  authorId,
  initialTab,
  onClose,
}: {
  authorId: string;
  initialTab: FollowListKind;
  onClose: () => void;
}) {
  const t = useTranslations("profile");
  const [tab, setTab] = useState<FollowListKind>(initialTab);

  return (
    <Modal open onClose={onClose} title={t(tab)}>
      <div
        role="tablist"
        className="mb-3 flex rounded-[10px] border border-border p-1"
      >
        {TABS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => setTab(kind)}
            className={cn(
              "flex-1 rounded-[7px] py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
              tab === kind
                ? "bg-white/[0.06] text-foreground"
                : "text-foreground-tertiary hover:text-foreground",
            )}
          >
            {t(kind)}
          </button>
        ))}
      </div>

      {/* Remount per tab (key) so each tab owns its own scroll + query state. */}
      <FollowListPanel
        key={tab}
        authorId={authorId}
        kind={tab}
        onNavigate={onClose}
      />
    </Modal>
  );
}

function FollowListPanel({
  authorId,
  kind,
  onNavigate,
}: {
  authorId: string;
  kind: FollowListKind;
  onNavigate: () => void;
}) {
  const t = useTranslations("profile");
  const query = useFollowList(authorId, kind);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return <LoadingState label={t("followsLoading")} />;
  }
  if (query.isError) {
    return (
      <Text variant="danger" className="py-6 text-center text-sm">
        {t("followsError")}
      </Text>
    );
  }
  if (items.length === 0) {
    return (
      <Text variant="secondary" className="py-6 text-center text-sm">
        {t(kind === "followers" ? "noFollowers" : "noFollowing")}
      </Text>
    );
  }

  return (
    <div className="min-h-[8rem]">
      <div className="flex flex-col divide-y divide-border">
        {items.map((user) => (
          <FollowUserRow key={user.id} user={user} onNavigate={onNavigate} />
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="mt-3 w-full"
        >
          {t("followsLoadMore")}
        </Button>
      )}
    </div>
  );
}
