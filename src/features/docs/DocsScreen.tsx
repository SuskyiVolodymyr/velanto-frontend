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

  return (
    <>
      <PageHeader
        brand
        crumb={th("docs")}
        trailing={
          <Link
            href="/updates"
            className="flex h-[38px] items-center rounded-[11px] border border-white/[0.12] px-[14px] text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
          >
            {tu("heading")}
          </Link>
        }
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10 md:flex-row md:gap-11">
        <DocsSidebar
          activeTopic={activeTopic}
          onSelect={(next) =>
            router.replace(`${pathname}?topic=${next}`, { scroll: false })
          }
        />
        <DocsArticle activeTopic={activeTopic} />
      </main>
    </>
  );
}
