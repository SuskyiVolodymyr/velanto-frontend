"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Skeleton } from "@/src/shared/components/Skeleton";
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
import { renderCommentBody } from "./mention-text";

/** A single comment's identity + body + row actions, shared by roots and
 *  replies. The Reply affordance renders only when `onReply` is supplied. */
function CommentView({
  packId,
  comment,
  canDelete,
  deleting,
  onDelete,
  onReply,
}: {
  packId: string;
  comment: Comment;
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
  return (
    <div>
      {/* items-start, not items-center: the right-hand action cluster (vote
          pill + trash) is taller than the identity row, and centring it would
          drag the username down off the top of the entry. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <AuthorHoverTrigger
            authorId={comment.authorId}
            className="w-fit"
            prefetch={false}
          >
            {({ triggerProps }) => (
              // One identity Hidden wraps the whole avatar+name block so streamer
              // mode redacts them together behind a single reveal (not two
              // buttons crammed onto a compact comment row).
              <Hidden kind="name" id={comment.authorId}>
                <Link
                  href={`/users/${comment.authorId}`}
                  {...triggerProps}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <UserAvatar
                    username={comment.authorUsername}
                    avatarKey={comment.authorAvatarKey}
                    className="h-7 w-7 flex-none rounded-full border border-border bg-surface text-[11px] text-foreground-secondary"
                  />
                  <Username
                    username={comment.authorUsername}
                    role={comment.authorRole}
                    trusted={comment.authorTrusted}
                  />
                </Link>
              </Hidden>
            )}
          </AuthorHoverTrigger>
          {/* The relative label is computed from `now`, so the server and the
              hydrating client can legitimately render different text (they
              render seconds apart). suppressHydrationWarning keeps the server
              copy on hydration and lets later renders refresh it; the exact
              instant stays machine-readable in `dateTime` regardless. */}
          {createdLabel && (
            <Text variant="tertiary" className="shrink-0 text-xs">
              <time dateTime={comment.createdAt} suppressHydrationWarning>
                {createdLabel}
              </time>
            </Text>
          )}
        </div>
        {/* Vote pill and delete share one row so the score sits on the same
            horizontal level as the trash icon instead of a line of its own. */}
        <div className="flex flex-none items-center gap-1">
          <VoteControl
            vote={(value) => commentsClient.vote(packId, comment.id, value)}
            initialLikes={comment.likes ?? 0}
            initialDislikes={comment.dislikes ?? 0}
            initialMyVote={comment.myVote ?? null}
            upvoteLabel={t("upvote")}
            downvoteLabel={t("downvote")}
            blockedReason={tAuth("logInToVote")}
            errorLabel={t("voteError")}
            size="sm"
          />
          {canDelete && (
            <button
              type="button"
              aria-label={t("deleteComment")}
              disabled={deleting}
              onClick={onDelete}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-foreground-tertiary transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {deleting ? (
                <Spinner size={14} />
              ) : (
                <Trash2 aria-hidden className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      {/* mt-2.5 on the Hidden wrapper (not on the Text) so the gap survives
          streamer mode, where the body is swapped for a reveal placeholder.
          Matches the skeleton's name-row → body spacing. */}
      <Hidden kind="comment" id={comment.id} className="mt-2.5">
        <Text variant="secondary" className="text-sm">
          {renderCommentBody(comment.body)}
        </Text>
      </Hidden>
      {onReply && (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onReply}
            className="text-xs font-medium text-foreground-tertiary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc rounded-[4px]"
          >
            {t("reply")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The rule that closes off one comment entry. Rendered by the caller (never by
 * {@link CommentView} itself) so it can be omitted after the last entry — a
 * trailing rule against the card's edge reads as a mistake — and so it inherits
 * the width of whatever container it sits in: full card width under a root,
 * the narrower indented width under a reply.
 */
function CommentDivider() {
  // border-strong, not border: the entry sits on `bg-surface` now, and the
  // 0.07-alpha `border` token that reads fine against the darker page
  // background all but disappears when both sides of the line are the surface.
  // Same reasoning as AuthorHoverCard/Tooltip, which are also on bg-surface.
  return <hr className="border-t border-border-strong" />;
}

/**
 * Pulsing placeholders for the comment list while it loads, so the section
 * holds its shape instead of flashing a spinner. Decorative (each card is
 * `aria-hidden`); a single sr-only `role="status"` carries the busy
 * announcement the {@link LoadingState} spinner used to.
 */
function CommentsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" data-testid="comments-skeleton">
      <span role="status" className="sr-only">
        {label}
      </span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden
          className="rounded-[12px] border border-border bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-16 flex-none" />
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          {/* The Reply affordance — the vote pill moved up to the header row. */}
          <Skeleton className="mt-3 h-3 w-10" />
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
  // Root ordering — Top (net score) by default, or New (newest first).
  const [sort, setSort] = useState<CommentSort>("top");
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
    <div className="mb-6 flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          blocked ? tAuth("logInToComment") : t("commentPlaceholder")
        }
        aria-label={t("commentLabel")}
        rows={2}
        readOnly={blocked}
        disabled={posting}
        className={cn(
          "rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45",
          blocked && "cursor-not-allowed opacity-60",
        )}
      />
      {postError && (
        <Text variant="danger" className="text-sm">
          {postError}
        </Text>
      )}
      <Button
        className={cn("self-end", blocked && "cursor-not-allowed opacity-45")}
        aria-disabled={blocked || undefined}
        disabled={blocked ? false : !draft.trim() || posting}
        loading={posting}
        onClick={handlePost}
      >
        {t("post")}
      </Button>
    </div>
  );

  const replyPending = (rootId: string) =>
    replyComment.isPending && replyComment.variables?.parentId === rootId;

  function renderReplyComposer(rootId: string) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={replyDraft}
          onChange={(e) => setReplyDraft(e.target.value)}
          placeholder={t("replyPlaceholder")}
          aria-label={t("replyLabel")}
          rows={2}
          autoFocus
          disabled={replyPending(rootId)}
          className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
        />
        {replyError && (
          <Text variant="danger" className="text-sm">
            {replyError}
          </Text>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setReplyingToId(null);
              setReplyDraft("");
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            disabled={!replyDraft.trim() || replyPending(rootId)}
            loading={replyPending(rootId)}
            onClick={() => handlePostReply(rootId)}
          >
            {t("post")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Text
          as="h2"
          variant="tertiary"
          className="text-xs uppercase tracking-wide"
        >
          {t("comments", { count: total })}
        </Text>
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
        <div className="flex flex-col gap-4">
          {deleteError && (
            <Text variant="danger" className="text-sm">
              {deleteError}
            </Text>
          )}
          {roots.map((root) => {
            const replies = root.replies ?? [];
            return (
              <div
                key={root.id}
                className="rounded-[12px] border border-border bg-surface p-4"
              >
                <CommentView
                  packId={packId}
                  comment={root}
                  canDelete={canDelete(root)}
                  deleting={deletingId === root.id}
                  onDelete={() => handleDelete(root)}
                  onReply={authenticated ? () => openReply(root.id) : undefined}
                />

                {(replies.length > 0 || replyingToId === root.id) && (
                  <>
                    {/* Closes off the root entry. Only rendered when something
                        follows it inside the card. */}
                    <div className="mt-4">
                      <CommentDivider />
                    </div>
                    <div className="mt-4 flex flex-col gap-4 border-s border-border ps-3.5">
                      {replies.map((reply, index) => (
                        <Fragment key={reply.id}>
                          <CommentView
                            packId={packId}
                            comment={reply}
                            canDelete={canDelete(reply)}
                            deleting={deletingId === reply.id}
                            onDelete={() => handleDelete(reply)}
                            onReply={
                              authenticated
                                ? () => openReply(root.id, reply.authorUsername)
                                : undefined
                            }
                          />
                          {/* No rule after the last reply — it would sit against
                              the card's own edge and read as a mistake. */}
                          {index < replies.length - 1 && <CommentDivider />}
                        </Fragment>
                      ))}
                      {replyingToId === root.id && renderReplyComposer(root.id)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loadStatus === "ready" && roots.length < total && (
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="secondary"
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
