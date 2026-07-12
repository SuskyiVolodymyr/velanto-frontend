"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import type { FeedbackComment } from "@/src/shared/types/feedback";
import {
  useFeedbackComments,
  useAddComment,
} from "@/src/features/feedback/api/feedback-comments.queries";

export function FeedbackComments({ feedbackId }: { feedbackId: string }) {
  const t = useTranslations("feedback");
  const tAuth = useTranslations("authGate");
  const { status } = useAuth();
  const blocked = status === "unauthenticated";
  const [draft, setDraft] = useState("");

  const commentsQuery = useFeedbackComments(feedbackId);
  const addComment = useAddComment(feedbackId);

  // Flatten the loaded pages, de-duping by id (a comment posted between page
  // loads shifts server offsets, so a later page can re-return an earlier one).
  const comments = useMemo(() => {
    const seen = new Set<string>();
    const out: FeedbackComment[] = [];
    for (const page of commentsQuery.data?.pages ?? []) {
      for (const comment of page.items) {
        if (!seen.has(comment.id)) {
          seen.add(comment.id);
          out.push(comment);
        }
      }
    }
    return out;
  }, [commentsQuery.data]);

  const total = commentsQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = commentsQuery.data !== undefined;
  const loadStatus: "loading" | "ready" | "error" = commentsQuery.isLoading
    ? "loading"
    : !hasData && commentsQuery.isError
      ? "error"
      : "ready";
  const loadingMore = commentsQuery.isFetchingNextPage;
  const loadMoreError =
    hasData && (commentsQuery.isError || commentsQuery.isFetchNextPageError)
      ? t("loadMoreCommentsError")
      : "";

  const posting = addComment.isPending;
  const postError = addComment.isError
    ? messageFromError(addComment.error, { fallback: t("postError") })
    : "";

  function handlePost() {
    if (status !== "authenticated") return;
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(body, { onSuccess: () => setDraft("") });
  }

  // A signed-out viewer sees the whole composer blocked: the textarea is
  // read-only and shows the reason as its placeholder, the Post button is
  // aria-disabled, and one tooltip covers the lot (so it's clear from the
  // input — not just the button — why it's inert).
  const composer = (
    <div className="mb-6 flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          blocked ? tAuth("logInToComment") : t("commentPlaceholder")
        }
        aria-label={t("commentAria")}
        rows={2}
        readOnly={blocked}
        disabled={posting}
        className={cn(
          "rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45",
          blocked && "cursor-not-allowed opacity-60",
        )}
      />
      {postError && <Text className="text-sm text-[#ff6b6b]">{postError}</Text>}
      <Button
        className={cn("self-end", blocked && "cursor-not-allowed opacity-45")}
        aria-disabled={blocked || undefined}
        disabled={blocked ? false : !draft.trim() || posting}
        onClick={handlePost}
      >
        {t("postComment")}
      </Button>
    </div>
  );

  return (
    <section>
      <Text
        as="h2"
        variant="tertiary"
        className="mb-4 text-xs uppercase tracking-wide"
      >
        {t("commentsHeading", { count: total })}
      </Text>

      {status !== "loading" &&
        (blocked ? (
          <Tooltip content={tAuth("logInToComment")} block>
            {composer}
          </Tooltip>
        ) : (
          composer
        ))}

      {loadStatus === "loading" && (
        <Text variant="secondary">{t("loadingComments")}</Text>
      )}
      {loadStatus === "error" && (
        <Text className="text-[#ff6b6b]">{t("commentsLoadError")}</Text>
      )}
      {loadStatus === "ready" && comments.length === 0 && (
        <Text variant="secondary">{t("noComments")}</Text>
      )}
      {loadStatus === "ready" && comments.length > 0 && (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <div className="flex items-baseline gap-2">
                <Hidden kind="name" id={comment.authorId}>
                  <Link
                    href={`/users/${comment.authorId}`}
                    className="text-sm hover:underline"
                  >
                    <Username
                      username={comment.authorUsername}
                      role={comment.authorRole}
                      trusted={comment.authorTrusted}
                    />
                  </Link>
                </Hidden>
                <span className="text-xs text-foreground-tertiary">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <Hidden kind="comment" id={comment.id}>
                <Text variant="secondary" className="text-sm">
                  {comment.body}
                </Text>
              </Hidden>
            </div>
          ))}
        </div>
      )}

      {loadStatus === "ready" && comments.length < total && (
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void commentsQuery.fetchNextPage()}
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
          {loadMoreError && (
            <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>
          )}
        </div>
      )}
    </section>
  );
}
