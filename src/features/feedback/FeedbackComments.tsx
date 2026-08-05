"use client";
import { SignInGate } from "@/src/shared/components/SignInGate";
import { formatDateTime } from "@/src/shared/lib/format-date";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import {
  CommentComposerCard,
  CommentIdentityBadge,
  CommentRow,
  CommentsHeading,
  COMMENT_CARD_CLASS,
  COMMENT_LIST_CLASS,
  commentAvatarSize,
} from "@/src/shared/components/CommentCard";
import { AuthorHoverTrigger } from "@/src/features/pack/AuthorHoverTrigger";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { isStaff } from "@/src/shared/lib/user-role";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import type { FeedbackComment } from "@/src/shared/types/feedback";
import {
  useFeedbackComments,
  useAddComment,
} from "@/src/features/feedback/api/feedback-comments.queries";

export function FeedbackComments({ feedbackId }: { feedbackId: string }) {
  const t = useTranslations("feedback");
  const tAuth = useTranslations("authGate");
  const { status, user } = useAuth();
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
    <CommentComposerCard
      avatar={
        user && (
          <UserAvatar
            username={user.username}
            avatarKey={user.avatarKey}
            tone
            className={commentAvatarSize("root")}
          />
        )
      }
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-[11px]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              blocked ? tAuth("logInToComment") : t("commentPlaceholder")
            }
            aria-label={t("commentAria")}
            rows={1}
            readOnly={blocked}
            disabled={posting}
            className={cn(
              "min-h-[38px] min-w-0 flex-1 resize-y rounded-[11px] border border-white/10 bg-background px-3.5 py-2 text-[13.5px] leading-[1.55] text-foreground outline-none focus-visible:border-acc disabled:opacity-45",
            )}
          />
          {/* `size="sm"` rather than a height in className: cn() is a plain
              join, so an h-* here would sit alongside the size's own. */}
          <Button
            variant="secondary"
            size="sm"
            className={cn("flex-none")}
            aria-disabled={blocked || undefined}
            disabled={blocked ? false : !draft.trim() || posting}
            loading={posting}
            onClick={handlePost}
          >
            {t("postComment")}
          </Button>
        </div>
        {postError && (
          <Text variant="danger" className="text-sm">
            {postError}
          </Text>
        )}
      </div>
    </CommentComposerCard>
  );

  return (
    <section className="flex flex-col gap-3 border-t border-white/[0.07] pt-4">
      <CommentsHeading>
        {t("commentsHeading", { count: total })}
      </CommentsHeading>

      {status !== "loading" &&
        (blocked ? (
          <SignInGate message={tAuth("logInToComment")} block>
            {composer}
          </SignInGate>
        ) : (
          composer
        ))}

      {loadStatus === "loading" && (
        <LoadingState label={t("loadingComments")} showLabel />
      )}
      {loadStatus === "error" && (
        <Text variant="danger">{t("commentsLoadError")}</Text>
      )}
      {loadStatus === "ready" && comments.length === 0 && (
        <Text variant="secondary" className="text-[13.5px]">
          {t("noComments")}
        </Text>
      )}
      {loadStatus === "ready" && comments.length > 0 && (
        <div className={COMMENT_LIST_CLASS}>
          {comments.map((comment) => (
            <div key={comment.id} className={COMMENT_CARD_CLASS}>
              <CommentRow
                // No `actions`: a suggestion comment has no votes and no
                // replies on the backend, so the row that would hold them is
                // omitted rather than rendered with dead controls.
                avatar={
                  <UserAvatar
                    username={comment.authorUsername}
                    tone
                    className={commentAvatarSize("root")}
                  />
                }
                identity={
                  <AuthorHoverTrigger
                    authorId={comment.authorId}
                    className="w-fit"
                    prefetch={false}
                  >
                    {({ triggerProps }) => (
                      <Hidden kind="name" id={comment.authorId}>
                        <Link
                          href={`/users/${comment.authorId}`}
                          {...triggerProps}
                          className="hover:underline"
                        >
                          <Username
                            username={comment.authorUsername}
                            role={comment.authorRole}
                            trusted={comment.authorTrusted}
                            at
                          />
                        </Link>
                      </Hidden>
                    )}
                  </AuthorHoverTrigger>
                }
                // Hardcoded English, same convention as the role pills in
                // user-role.ts — these ALL-CAPS identity words aren't localized.
                badge={
                  isStaff(comment.authorRole) && (
                    <CommentIdentityBadge>TEAM</CommentIdentityBadge>
                  )
                }
                timestamp={
                  <time dateTime={comment.createdAt}>
                    {formatDateTime(comment.createdAt)}
                  </time>
                }
                body={
                  <Hidden kind="comment" id={comment.id}>
                    <span className="whitespace-pre-wrap">{comment.body}</span>
                  </Hidden>
                }
              />
            </div>
          ))}
        </div>
      )}

      {loadStatus === "ready" && comments.length < total && (
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={loadingMore}
            onClick={() => void commentsQuery.fetchNextPage()}
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
          {loadMoreError && (
            <Text variant="danger" className="text-sm">
              {loadMoreError}
            </Text>
          )}
        </div>
      )}
    </section>
  );
}
