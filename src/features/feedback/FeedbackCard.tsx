import Link from "next/link";
import { Badge } from "@/src/shared/components/Badge";
import { Text } from "@/src/shared/components/Text";
import type { Feedback, FeedbackStatus, FeedbackTopic } from "@/src/shared/types/feedback";

export const TOPIC_LABELS: Record<FeedbackTopic, string> = {
  bug: "Bug",
  feature: "Feature",
  translation: "Translation",
  other: "Other",
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
  declined: "Declined",
};

const STATUS_BADGE_CLASS: Record<FeedbackStatus, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  in_progress: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  done: "border-green-500/30 bg-green-500/10 text-green-400",
  declined: "border-red-500/30 bg-red-500/10 text-red-400",
};

export function FeedbackCard({ post, compact }: { post: Feedback; compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href={`/feedback/${post.id}`}
        className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 hover:bg-white/[0.03]"
      >
        <span className="shrink-0 rounded-[8px] bg-white/[0.04] px-2.5 py-1 text-sm font-semibold text-foreground">
          {post.score}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Text className="truncate text-sm font-semibold">{post.title}</Text>
          <Badge>{TOPIC_LABELS[post.topic]}</Badge>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/feedback/${post.id}`}
      className="flex items-start gap-4 rounded-[12px] border border-border bg-surface px-4 py-3 hover:bg-white/[0.03]"
    >
      <span className="flex shrink-0 flex-col items-center rounded-[8px] bg-white/[0.04] px-3 py-2">
        <span className="text-base font-semibold text-foreground">{post.score}</span>
        <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary">score</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{TOPIC_LABELS[post.topic]}</Badge>
          <Badge className={STATUS_BADGE_CLASS[post.status]}>{STATUS_LABELS[post.status]}</Badge>
        </div>
        <Text className="font-semibold">{post.title}</Text>
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="tertiary" className="text-xs">
            by {post.authorUsername}
          </Text>
          <Text variant="tertiary" className="text-xs">
            · {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </Text>
        </div>
      </div>
    </Link>
  );
}
