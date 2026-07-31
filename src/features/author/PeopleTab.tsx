"use client";

import { useState } from "react";
import { Users } from "lucide-react";
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
    <div className="flex flex-col gap-3.5">
      {/* The mock's segmented track: a lifted, bordered rail with the active
          option filled — not two loose text buttons. */}
      <div
        role="tablist"
        className="inline-flex self-start rounded-control border border-white/[0.08] bg-surface-card p-[3px]"
      >
        {TABS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => setTab(kind)}
            className={cn(
              "h-8 cursor-pointer rounded-[9px] px-3.5 text-[12.5px] font-[650] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
              tab === kind
                ? "bg-white/10 text-foreground"
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
    const followers = kind === "followers";
    return (
      <EmptyState
        icon={<Users size={21} strokeWidth={1.8} />}
        title={t(followers ? "noFollowers" : "noFollowing")}
        description={t(followers ? "noFollowersNote" : "noFollowingNote")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* min(288px,100%), not a bare 288px: AuthorScreen's container is only
          ~264px wide at a 320px viewport (px-7 both sides), so a hard 288px
          minimum would force horizontal overflow. AuthorPackList's own
          auto-fill grid gets away with a bare 262px only because 262 < 264 —
          this card is wider, so it needs the clamp explicitly. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(288px,100%),1fr))] gap-2.5">
        {items.map((user) => (
          <FollowUserRow key={user.id} user={user} />
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="outline"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="self-center"
        >
          {t("followsLoadMore")}
        </Button>
      )}
    </div>
  );
}
