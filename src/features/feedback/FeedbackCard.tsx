import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { Username } from "@/src/shared/components/Username";
import { cn } from "@/src/shared/lib/cn";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { isStaff } from "@/src/shared/lib/user-role";
import { feedbackTopicTone } from "@/src/features/feedback/feedback-tone";
import type { Feedback, FeedbackTopic } from "@/src/shared/types/feedback";

// Feedback topic value → key in the `feedback` i18n namespace.
export const TOPIC_KEYS: Record<FeedbackTopic, string> = {
  bug: "topicBug",
  feature: "topicFeature",
  translation: "topicTranslation",
  other: "topicOther",
};

/** Rank tones for the "Most wanted" rail — only the leader is gilded. */
const RANK_TONE = [
  "bg-score/[0.14] text-score",
  "bg-white/[0.06] text-foreground-secondary",
];

export function FeedbackCard({
  post,
  compact,
  rank,
}: {
  post: Feedback;
  /** The narrow "Most wanted" rail row rather than the full list card. */
  compact?: boolean;
  /** 0-based position, `compact` only — index 0 gets the amber score tile. */
  rank?: number;
}) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  if (compact) {
    return (
      <Link
        href={`/feedback/${post.id}`}
        className="flex items-center gap-[11px] rounded-control border border-white/[0.06] bg-background px-[11px] py-2.5 transition-colors hover:border-white/[0.18]"
      >
        <span
          data-mono
          className={cn(
            "grid h-[30px] min-w-[34px] shrink-0 place-items-center rounded-[9px] px-[7px] text-[13px] font-bold",
            RANK_TONE[rank === 0 ? 0 : 1],
          )}
        >
          {post.score}
        </span>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[12.5px] font-[650] text-foreground">
            {post.title}
          </span>
          <span
            className={cn(
              "text-[10.5px] font-bold tracking-[0.04em]",
              feedbackTopicTone(post.topic).label,
            )}
          >
            {t(TOPIC_KEYS[post.topic])}
          </span>
        </div>
      </Link>
    );
  }

  const when = formatRelativeTimeIntl(post.createdAt, locale);

  return (
    <Link
      href={`/feedback/${post.id}`}
      // Article rather than a bare link so the list reads as a set of items to
      // assistive tech, and so a test can scope assertions to one card.
      role="article"
      className={cn(
        "flex items-start gap-[13px] rounded-[15px] border bg-surface-card p-[14px] transition-colors hover:border-white/[0.18]",
        // A post you've already voted on keeps a faint accent edge, so your own
        // votes are findable in a long list without a second badge.
        post.myVote !== null ? "border-acc/[0.28]" : "border-border",
      )}
    >
      <span className="flex shrink-0 flex-col items-center rounded-chip bg-white/[0.04] px-3 py-2">
        <span data-mono className="text-base font-[650] text-foreground">
          {post.score}
        </span>
        <span className="text-[10px] uppercase tracking-[0.06em] text-foreground-tertiary">
          {t("scoreLabel")}
        </span>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-[7px]">
          {/* A bordered neutral chip, not the borderless pill `Badge` — the mock
              pairs it with StatusBadge and the two share a geometry. */}
          <span className="inline-flex items-center rounded-chip border border-white/10 bg-white/[0.04] px-[9px] py-[3px] text-[11.5px] font-medium text-foreground-secondary">
            {t(TOPIC_KEYS[post.topic])}
          </span>
          <StatusBadge kind="feedback" status={post.status} />
        </div>

        <span className="text-[15px] font-[650] leading-snug tracking-[-0.01em] text-foreground">
          {post.title}
        </span>
        <p className="line-clamp-2 text-[12.5px] leading-[1.5] text-foreground-secondary">
          {post.body}
        </p>

        <div className="flex flex-wrap items-center gap-[9px] pt-0.5">
          <Username
            username={post.authorUsername}
            role={post.authorRole}
            trusted={post.authorTrusted}
            at
            className="text-xs"
          />
          {/* Hardcoded English, same convention as the role pills in
              user-role.ts — these ALL-CAPS identity words aren't localized. */}
          {isStaff(post.authorRole) && (
            <span className="inline-flex items-center rounded-pill bg-acc/[0.16] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.04em] text-acc-hover">
              TEAM
            </span>
          )}
          {when && (
            <time
              dateTime={post.createdAt}
              suppressHydrationWarning
              className="text-[11.5px] text-foreground-tertiary"
            >
              {when}
            </time>
          )}
          <span
            className="ms-auto flex items-center gap-1.5 text-xs text-foreground-tertiary"
            aria-label={t("commentCount", { count: post.commentCount })}
          >
            <MessageSquare aria-hidden size={13} strokeWidth={1.9} />
            {post.commentCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
