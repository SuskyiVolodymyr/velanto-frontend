import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import type { Feedback, FeedbackTopic } from "@/src/shared/types/feedback";

// Feedback topic value → key in the `feedback` i18n namespace.
export const TOPIC_KEYS: Record<FeedbackTopic, string> = {
  bug: "topicBug",
  feature: "topicFeature",
  translation: "topicTranslation",
  other: "topicOther",
};

export function FeedbackCard({
  post,
  compact,
}: {
  post: Feedback;
  compact?: boolean;
}) {
  const t = useTranslations("feedback");
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
          <Badge>{t(TOPIC_KEYS[post.topic])}</Badge>
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
        <span className="text-base font-semibold text-foreground">
          {post.score}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary">
          {t("scoreLabel")}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t(TOPIC_KEYS[post.topic])}</Badge>
          <StatusBadge kind="feedback" status={post.status} />
        </div>
        <Text className="font-semibold">{post.title}</Text>
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="tertiary" className="text-xs">
            {t("by")}{" "}
            <Username
              username={post.authorUsername}
              role={post.authorRole}
              trusted={post.authorTrusted}
            />
          </Text>
          <Text variant="tertiary" className="text-xs">
            · {t("commentCount", { count: post.commentCount })}
          </Text>
        </div>
      </div>
    </Link>
  );
}
