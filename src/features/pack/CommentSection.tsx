"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reply, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Skeleton } from "@/src/shared/components/Skeleton";
import {
  CommentAction,
  CommentComposerCard,
  CommentIdentityBadge,
  CommentRow,
  CommentsHeading,
  COMMENT_CARD_CLASS,
  COMMENT_LIST_CLASS,
  REPLY_COMPOSER_RAIL_CLASS,
  REPLY_RAIL_CLASS,
  commentAvatarSize,
  type CommentRowVariant,
} from "@/src/shared/components/CommentCard";
import { Button } from "@/src/shared/components/Button";
import { Spinner } from "@/src/shared/components/Spinner";
import { Hidden } from "@/src/shared/components/Hidden";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { VoteControl } from "@/src/shared/components/VoteControl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { isStaff } from "@/src/shared/lib/user-role";
import { cn } from "@/src/shared/lib/cn";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import {
  commentsClient,
  type CommentSort,
} from "@/src/shared/lib/comments-client";
import type { Comment } from "@/src/shared/types/comment";
import {
  usePackComments,
  useAddPackComment,
  useReplyToComment,
  useDeletePackComment,
} from "@/src/features/pack/api/pack-comments.queries";
import { AuthorHoverTrigger } from "./AuthorHoverTrigger";
import { ReportCommentAction } from "./ReportCommentAction";
import { renderCommentBody } from "./mention-text";

/** A single comment's identity + body + row actions, shared by roots and
 *  replies. The Reply affordance renders only when `onReply` is supplied. */
function CommentView({
  packId,
  comment,
  isReply = false,
  isPackCreator,
  canDelete,
  deleting,
  onDelete,
  onReply,
}: {
  packId: string;
  comment: Comment;
  /** Renders the smaller variant used inside a thread's reply rail. */
  isReply?: boolean;
  /** Whether this comment's author is the pack's own creator — shows a badge. */
  isPackCreator: boolean;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onReply?: () => void;
}) {
  const t = useTranslations("pack");
  const tAuth = useTranslations("authGate");
  const locale = useLocale();
  // Null for an unparseable/absent timestamp — render no <time> at all rather
  // than an empty one (see formatRelativeTimeIntl).
  const createdLabel = formatRelativeTimeIntl(comment.createdAt, locale);
  const variant: CommentRowVariant = isReply ? "reply" : "root";
  return (
    <CommentRow
      variant={variant}
      avatar={
        <UserAvatar
          username={comment.authorUsername}
          avatarKey={comment.authorAvatarKey}
          tone
          className={commentAvatarSize(variant)}
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
      badge={
        isPackCreator && (
          <CommentIdentityBadge>{t("creatorBadge")}</CommentIdentityBadge>
        )
      }
      // The relative label is computed from `now`, so the server and the
      // hydrating client can legitimately render different text (they render
      // seconds apart). suppressHydrationWarning keeps the server copy on
      // hydration and lets later renders refresh it; the exact instant stays
      // machine-readable in `dateTime` regardless.
      timestamp={
        createdLabel && (
          <time dateTime={comment.createdAt} suppressHydrationWarning>
            {createdLabel}
          </time>
        )
      }
      body={
        <Hidden kind="comment" id={comment.id}>
          {renderCommentBody(comment.body)}
        </Hidden>
      }
      trailing={
        canDelete && (
          <button
            type="button"
            aria-label={t("deleteComment")}
            disabled={deleting}
            onClick={onDelete}
            className="inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-[7px] text-foreground-tertiary transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-50"
          >
            {deleting ? (
              <Spinner size={14} />
            ) : (
              <Trash2 aria-hidden className="h-4 w-4" />
            )}
          </button>
        )
      }
      // The reactions render even for a signed-out viewer (who gets no Reply),
      // because the counts are still worth reading.
      actions={
        <>
          <VoteControl
            vote={(value) => commentsClient.vote(packId, comment.id, value)}
            initialLikes={comment.likes ?? 0}
            initialDislikes={comment.dislikes ?? 0}
            initialMyVote={comment.myVote ?? null}
            upvoteLabel={t("upvote")}
            downvoteLabel={t("downvote")}
            blockedReason={tAuth("logInToVote")}
            errorLabel={t("voteError")}
          />
          {onReply && (
            <CommentAction variant={variant} onClick={onReply}>
              <Reply aria-hidden className="h-[13px] w-[13px]" />
              {t("reply")}
            </CommentAction>
          )}
          <ReportCommentAction
            commentId={comment.id}
            authorId={comment.authorId}
            authorUsername={comment.authorUsername}
            body={comment.body}
            variant={variant}
          />
        </>
      }
    />
  );
}

/**
 * Pulsing placeholders for the comment list while it loads, so the section
 * holds its shape instead of flashing a spinner. Mirrors the real list: three
 * thread cards. Decorative (each card is `aria-hidden`); a single sr-only
 * `role="status"` carries the busy announcement.
 */
function CommentsSkeleton({ label }: { label: string }) {
  return (
    <div className={COMMENT_LIST_CLASS} data-testid="comments-skeleton">
      <span role="status" className="sr-only">
        {label}
      </span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden className={COMMENT_CARD_CLASS}>
          <div className="flex gap-[11px]">
            <Skeleton className="h-8 w-8 flex-none rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              {/* The action row: two reactions, then Reply. */}
              <div className="flex items-center gap-3.5 pt-0.5">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommentSection({
  packId,
  packAuthorId,
}: {
  packId: string;
  /** The pack's author — allowed to delete any comment on their own pack. */
  packAuthorId?: string;
}) {
  const { status, user } = useAuth();
  const t = useTranslations("pack");
  const tAuth = useTranslations("authGate");
  const blocked = status === "unauthenticated";
  const authenticated = status === "authenticated";
  const [draft, setDraft] = useState("");
  // Root ordering. Newest-first is the default: on a thread that's still
  // filling up, a fresh comment being invisible until it out-scores the old
  // ones is what kills the conversation. Top is one click away.
  const [sort, setSort] = useState<CommentSort>("new");
  // The root whose inline reply composer is open (null = none), plus its text.
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const commentsQuery = usePackComments(packId, sort);
  const addComment = useAddPackComment(packId, sort);
  const replyComment = useReplyToComment(packId, sort);
  const deleteComment = useDeletePackComment(packId, sort);
  const deletingId = deleteComment.isPending
    ? (deleteComment.variables ?? null)
    : null;
  const deleteError = deleteComment.isError ? t("deleteCommentError") : "";

  // A comment is deletable by its own author, the pack's author, or any staff
  // (moderator+) — the backend enforces the same rule; this just gates the UI.
  const canDelete = (comment: Comment) =>
    !!user &&
    (user.id === comment.authorId ||
      user.id === packAuthorId ||
      isStaff(user.role));

  function handleDelete(comment: Comment) {
    const hasReplies = (comment.replyCount ?? comment.replies?.length ?? 0) > 0;
    const message = hasReplies
      ? t("deleteCommentThreadConfirm")
      : t("deleteCommentConfirm");
    if (!window.confirm(message)) return;
    deleteComment.mutate(comment.id);
  }

  // Opening a reply composer: on a root it starts empty; on a reply it
  // pre-fills an @mention of the reply's author (the reply still attaches to
  // the root — two-level threading).
  function openReply(rootId: string, mentionUsername?: string) {
    // Clear any error left over from a previous composer so a freshly-opened
    // one doesn't surface a stale "couldn't post" before the user types.
    replyComment.reset();
    setReplyingToId(rootId);
    setReplyDraft(mentionUsername ? `@${mentionUsername} ` : "");
  }

  function handlePostReply(rootId: string) {
    const body = replyDraft.trim();
    if (!body) return;
    replyComment.mutate(
      { body, parentId: rootId },
      {
        onSuccess: () => {
          setReplyingToId(null);
          setReplyDraft("");
        },
      },
    );
  }

  // Dedup roots by id across pages (a post can shift server offsets so the next
  // page re-returns an already-shown root).
  const roots = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
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
      ? t("loadMoreError")
      : "";

  const posting = addComment.isPending;
  const postError = addComment.isError
    ? messageFromError(addComment.error, { fallback: t("postErrorFallback") })
    : "";
  const replyError =
    replyComment.isError && replyingToId
      ? messageFromError(replyComment.error, {
          fallback: t("postErrorFallback"),
        })
      : "";

  function handlePost() {
    if (!authenticated) return;
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
            aria-label={t("commentLabel")}
            rows={1}
            readOnly={blocked}
            disabled={posting}
            className={cn(
              "min-h-[38px] min-w-0 flex-1 resize-y rounded-[11px] border border-white/10 bg-background px-3.5 py-2 text-[13.5px] leading-[1.55] text-foreground outline-none focus-visible:border-acc disabled:opacity-45",
              blocked && "cursor-not-allowed opacity-60",
            )}
          />
          {/* `size="sm"` rather than a height in className: cn() is a plain
              join, so an h-* here would sit alongside the size's own. */}
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "flex-none",
              blocked && "cursor-not-allowed opacity-45",
            )}
            aria-disabled={blocked || undefined}
            disabled={blocked ? false : !draft.trim() || posting}
            loading={posting}
            onClick={handlePost}
          >
            {t("post")}
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

  const replyPending = (rootId: string) =>
    replyComment.isPending && replyComment.variables?.parentId === rootId;

  // The open composer gets its own accent-tinted rail rather than sitting in
  // the neutral reply column, so an unsent draft reads as attached to the
  // thread it will join.
  function renderReplyComposer(rootId: string) {
    return (
      <div
        data-testid="reply-composer"
        className={cn(REPLY_COMPOSER_RAIL_CLASS, "flex flex-col gap-2")}
      >
        <div className="flex items-start gap-2.5">
          {user && (
            <UserAvatar
              username={user.username}
              avatarKey={user.avatarKey}
              tone
              className={commentAvatarSize("reply")}
            />
          )}
          <textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder={t("replyPlaceholder")}
            aria-label={t("replyLabel")}
            rows={1}
            autoFocus
            disabled={replyPending(rootId)}
            className="min-h-[38px] min-w-0 flex-1 resize-y rounded-[11px] border border-acc/35 bg-background px-3.5 py-2 text-[13px] leading-[1.55] text-foreground outline-none focus-visible:border-acc disabled:opacity-45"
          />
        </div>
        {replyError && (
          <Text variant="danger" className="text-sm">
            {replyError}
          </Text>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setReplyingToId(null);
              setReplyDraft("");
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            size="xs"
            disabled={!replyDraft.trim() || replyPending(rootId)}
            loading={replyPending(rootId)}
            onClick={() => handlePostReply(rootId)}
          >
            {t("reply")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <CommentsHeading>{t("comments", { count: total })}</CommentsHeading>
        {loadStatus === "ready" && total > 0 && (
          <div
            role="group"
            aria-label={t("sortLabel")}
            className="inline-flex flex-none rounded-[8px] border border-border p-0.5"
          >
            {(["top", "new"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sort === option}
                onClick={() => setSort(option)}
                className={cn(
                  "rounded-[6px] px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  sort === option
                    ? "bg-white/[0.06] text-foreground"
                    : "text-foreground-tertiary hover:text-foreground",
                )}
              >
                {option === "top" ? t("sortTop") : t("sortNew")}
              </button>
            ))}
          </div>
        )}
      </div>

      {status !== "loading" &&
        (blocked ? (
          <Tooltip content={tAuth("logInToComment")} block>
            {composer}
          </Tooltip>
        ) : (
          composer
        ))}

      {loadStatus === "loading" && (
        <CommentsSkeleton label={t("loadingComments")} />
      )}
      {loadStatus === "error" && (
        <Text variant="danger">{t("loadCommentsError")}</Text>
      )}
      {loadStatus === "ready" && roots.length === 0 && (
        <Text variant="secondary">{t("noComments")}</Text>
      )}
      {loadStatus === "ready" && roots.length > 0 && (
        <div className={COMMENT_LIST_CLASS}>
          {deleteError && (
            <Text variant="danger" className="text-sm">
              {deleteError}
            </Text>
          )}
          {/* One card per top-level thread — a root and everything hanging off
              it are one block, and the gap between cards is what separates one
              conversation from the next. */}
          {roots.map((root) => {
            const replies = root.replies ?? [];
            return (
              <div
                key={root.id}
                data-testid="comment-thread"
                className={COMMENT_CARD_CLASS}
              >
                <CommentView
                  packId={packId}
                  comment={root}
                  isPackCreator={root.authorId === packAuthorId}
                  canDelete={canDelete(root)}
                  deleting={deletingId === root.id}
                  onDelete={() => handleDelete(root)}
                  onReply={authenticated ? () => openReply(root.id) : undefined}
                />

                {replies.length > 0 && (
                  <div className={REPLY_RAIL_CLASS}>
                    {replies.map((reply) => (
                      <CommentView
                        key={reply.id}
                        packId={packId}
                        comment={reply}
                        isReply
                        isPackCreator={reply.authorId === packAuthorId}
                        canDelete={canDelete(reply)}
                        deleting={deletingId === reply.id}
                        onDelete={() => handleDelete(reply)}
                        onReply={
                          authenticated
                            ? () => openReply(root.id, reply.authorUsername)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {replyingToId === root.id && renderReplyComposer(root.id)}
              </div>
            );
          })}
        </div>
      )}

      {loadStatus === "ready" && roots.length < total && (
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
