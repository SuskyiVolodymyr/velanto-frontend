import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { FeedbackCard } from "@/src/features/feedback/FeedbackCard";
import { feedbackStatusTone } from "@/src/features/feedback/feedback-tone";
import {
  FEEDBACK_STATUSES,
  type Feedback,
  type FeedbackStatus,
} from "@/src/shared/types/feedback";

const PANEL =
  "flex flex-col rounded-card border border-white/[0.07] bg-surface-card p-[18px]";

// Legend copy per status: the short label comes from the shared `status` ns (so
// it can't drift from StatusBadge), the sentence explaining it is local.
const STATUS_LABEL_KEY: Record<FeedbackStatus, string> = {
  new: "feedbackNew",
  in_progress: "feedbackInProgress",
  done: "feedbackDone",
  declined: "feedbackDeclined",
};
const STATUS_NOTE_KEY: Record<FeedbackStatus, string> = {
  new: "legendNew",
  in_progress: "legendInProgress",
  done: "legendDone",
  declined: "legendDeclined",
};

/**
 * The Suggestions rail: the three highest-scoring posts, then a legend for what
 * the four statuses mean. The legend is static copy rather than fetched — it
 * explains the workflow, not the data, so it renders even when the top-3 call
 * fails or the board is empty.
 */
export function FeedbackTopSidebar({ posts }: { posts: Feedback[] }) {
  const t = useTranslations("feedback");
  const tStatus = useTranslations("status");

  return (
    <aside className="flex w-full flex-col gap-3.5">
      <div className={cn(PANEL, "gap-[11px]")}>
        <div className="flex items-center gap-[9px]">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-score/[0.14] text-[#FFD27A]"
          >
            <BarChart3 size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[14.5px] font-bold text-foreground">
            {t("mostWanted")}
          </h2>
        </div>
        {posts.length === 0 ? (
          <p className="text-[12.5px] text-foreground-tertiary">
            {t("noFeedbackYet")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post, index) => (
              <FeedbackCard key={post.id} post={post} rank={index} compact />
            ))}
          </div>
        )}
      </div>

      <div className={cn(PANEL, "gap-2.5")}>
        <h2 className="text-[14.5px] font-bold text-foreground">
          {t("legendHeading")}
        </h2>
        {FEEDBACK_STATUSES.map((status) => (
          <div key={status} className="flex items-start gap-[9px]">
            <span
              aria-hidden
              className={cn(
                "mt-[5px] h-[7px] w-[7px] shrink-0 rounded-pill",
                feedbackStatusTone(status).dot,
              )}
            />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-[12.5px] font-[650] text-foreground">
                {tStatus(STATUS_LABEL_KEY[status])}
              </span>
              <span className="text-[11.5px] leading-[1.45] text-foreground-tertiary">
                {t(STATUS_NOTE_KEY[status])}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
