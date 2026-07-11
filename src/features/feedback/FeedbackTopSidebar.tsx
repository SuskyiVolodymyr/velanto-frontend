import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { FeedbackCard } from "@/src/features/feedback/FeedbackCard";
import type { Feedback } from "@/src/shared/types/feedback";

export function FeedbackTopSidebar({ posts }: { posts: Feedback[] }) {
  const t = useTranslations("feedback");
  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
      <Text as="h2" variant="title" className="text-lg">
        {t("topSidebarHeading")}
      </Text>
      {posts.length === 0 ? (
        <Text variant="tertiary" className="text-sm">
          {t("noFeedbackYet")}
        </Text>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <FeedbackCard key={post.id} post={post} compact />
          ))}
        </div>
      )}
    </aside>
  );
}
