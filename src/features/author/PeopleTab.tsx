"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { EmptyState } from "@/src/shared/components/EmptyState";
import { cn } from "@/src/shared/lib/cn";
import { useFollowList, type FollowListKind } from "./api/follow-list.queries";
import { FollowUserRow } from "./FollowUserRow";
import type { PeopleSubTab } from "./AuthorProfileHeader";

const TABS: PeopleSubTab[] = ["followers", "following"];

/**
 * The People tab's inline followers/following panel (resolves plan D2/D9,
 * replacing `FollowListModal`). Same sub-tab switch, `useFollowList` query and
 * "Show more" pagination `FollowListModal` used, lifted out of `Modal` into a
 * panel and restyled to the mock's card grid instead of a single-column list.
 * No search box (D9 — the followers/following endpoints have no `q` param).
 *
 * `initialSubTab` matches `ProfileTabs`'s `peoplePanel: (initialSubTab) =>
 * ReactNode` render-prop contract — like `FollowListModal`'s own `initialTab`,
 * it's only consulted on mount; a caller that wants to jump sub-tabs after
 * mount should remount with a `key` (see `ProfileTabs`'s doc comment).
 */
export function PeopleTab({
  authorId,
  initialSubTab,
}: {
  authorId: string;
  initialSubTab: PeopleSubTab;
}) {
  const t = useTranslations("profile");
  const [tab, setTab] = useState<PeopleSubTab>(initialSubTab);

  return (
    <div>
      <div
        role="tablist"
        className="mb-5 inline-flex rounded-[10px] border border-border p-1"
      >
        {TABS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => setTab(kind)}
            className={cn(
              "rounded-[7px] px-5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
              tab === kind
                ? "bg-white/[0.06] text-foreground"
                : "text-foreground-tertiary hover:text-foreground",
            )}
          >
            {t(kind)}
          </button>
        ))}
      </div>

      {/* Remount per tab (key) so each tab owns its own scroll + query state,
          same as FollowListModal's panel did. */}
      <PeopleListPanel key={tab} authorId={authorId} kind={tab} />
    </div>
  );
}

function PeopleListPanel({
  authorId,
  kind,
}: {
  authorId: string;
  kind: FollowListKind;
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
      <EmptyState title={t(kind === "followers" ? "noFollowers" : "noFollowing")} />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(288px,1fr))] gap-3">
        {items.map((user) => (
          <div
            key={user.id}
            className="rounded-tile border border-border bg-surface-card px-3"
          >
            <FollowUserRow user={user} />
          </div>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="mt-4 w-full"
        >
          {t("followsLoadMore")}
        </Button>
      )}
    </div>
  );
}
