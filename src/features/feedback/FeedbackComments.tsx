"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import type { FeedbackComment } from "@/src/shared/types/feedback";

const PAGE_SIZE = 10;

export function FeedbackComments({ feedbackId }: { feedbackId: string }) {
  const t = useTranslations("feedback");
  const { status } = useAuth();
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    let cancelled = false;
    feedbackClient
      .listComments(feedbackId, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setComments(result.items);
        setTotal(result.total);
        setPage(1);
        setLoadStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [feedbackId]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await feedbackClient.listComments(feedbackId, {
        page: nextPage,
        limit: PAGE_SIZE,
      });
      // A comment posted between page loads shifts every later comment's
      // server-side offset by one, so the next page can re-return a comment
      // already shown on a prior page — filter those out rather than trusting
      // the offset math to stay aligned with local inserts.
      setComments((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        return [...prev, ...result.items.filter((c) => !existingIds.has(c.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
      setLoadMoreError("");
    } catch {
      setLoadMoreError(t("loadMoreCommentsError"));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePost() {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const created = await feedbackClient.addComment(feedbackId, { body });
      setComments((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setDraft("");
      setPostError("");
    } catch (err) {
      // Surface the backend's specific validation message (e.g. the moderation
      // blocked-term rejection) when present, falling back to generic copy.
      setPostError(
        messageFromError(err, {
          fallback: t("postError"),
        }),
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <section>
      <Text
        as="h2"
        variant="tertiary"
        className="mb-4 text-xs uppercase tracking-wide"
      >
        {t("commentsHeading", { count: total })}
      </Text>

      {status === "authenticated" && (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("commentPlaceholder")}
            aria-label={t("commentAria")}
            rows={2}
            disabled={posting}
            className="rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
          />
          {postError && (
            <Text className="text-sm text-[#ff6b6b]">{postError}</Text>
          )}
          <Button
            className="self-end"
            disabled={!draft.trim() || posting}
            onClick={handlePost}
          >
            {t("postComment")}
          </Button>
        </div>
      )}
      {status === "unauthenticated" && (
        <div className="mb-6 rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          {t.rich("loginToComment", {
            link: (chunks) => (
              <Link href="/auth" className="text-acc">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}

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
                    className="text-sm font-semibold hover:underline"
                  >
                    {comment.authorUsername}
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
            onClick={handleLoadMore}
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
