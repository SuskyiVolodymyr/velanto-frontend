"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/src/shared/components/PageHeader";
import {
  DocsSidebar,
  TOPICS,
  DEFAULT_TOPIC,
  type TopicId,
} from "./DocsSidebar";
import { DocsArticle } from "./DocsArticle";
import { latestVersion } from "@/src/features/updates/updates-data";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

function topicFromParam(value: string | null): TopicId {
  return TOPICS.includes(value as TopicId) ? (value as TopicId) : DEFAULT_TOPIC;
}

/**
 * The docs reader: topic list beside the article.
 *
 * The active topic lives in the URL rather than component state, so /settings
 * can link straight at `?topic=api` and a refresh or a shared link lands back on
 * the same topic. `replace`, not `push`: flipping topics isn't a navigation step
 * worth a back-button entry (mirrors the moderation panel's tabs).
 */
export function DocsScreen() {
  const th = useTranslations("header");
  const tu = useTranslations("updates");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTopic = topicFromParam(searchParams.get("topic"));
  const latest = latestVersion();
  const selectTopic = (next: TopicId) =>
    router.replace(`${pathname}?topic=${next}`, { scroll: false });

  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        backFrom={["dashboard", "updates"]}
        crumb={th("docs")}
        trailing={
          <Link
            href="/updates"
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-white/[0.12] px-[14px] text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
          >
            {tu("heading")}
            {/* Mock pairs the link with the shipped version. Read from
                updates-data rather than pinned here, so cutting a release
                updates this pill and the changelog in one edit. */}
            {latest && (
              <span className="rounded-pill bg-acc/[0.16] px-[7px] py-px text-[10.5px] font-bold text-acc-hover">
                v{latest}
              </span>
            )}
          </Link>
        }
      />
      <main
        className={cn(
          pageContainer(1320),
          // Mock breaks the two columns at 820px, not Tailwind's `md` (768) —
          // the 220px nav plus a 672px article needs the extra room.
          "flex flex-1 flex-col items-start gap-5 pb-20 pt-[30px] min-[820px]:flex-row min-[820px]:gap-11",
        )}
      >
        <DocsSidebar activeTopic={activeTopic} onSelect={selectTopic} />
        <DocsArticle activeTopic={activeTopic} onSelect={selectTopic} />
      </main>
    </>
  );
}
