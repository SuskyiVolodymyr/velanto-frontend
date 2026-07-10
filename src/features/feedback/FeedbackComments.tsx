"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import type { FeedbackComment } from "@/src/shared/types/feedback";

const PAGE_SIZE = 10;

export function FeedbackComments({ feedbackId }: { feedbackId: string }) {
  const { status } = useAuth();
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
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
      const result = await feedbackClient.listComments(feedbackId, { page: nextPage, limit: PAGE_SIZE });
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
      setLoadMoreError("Couldn't load more comments. Try again.");
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
    } catch {
      setPostError("Couldn't post your comment. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section>
      <Text as="h2" variant="tertiary" className="mb-4 text-xs uppercase tracking-wide">
        Comments · {total}
      </Text>

      {status === "authenticated" && (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share your thoughts on this feedback…"
            aria-label="Comment"
            rows={2}
            disabled={posting}
            className="rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
          />
          {postError && <Text className="text-sm text-[#ff6b6b]">{postError}</Text>}
          <Button className="self-end" disabled={!draft.trim() || posting} onClick={handlePost}>
            Post
          </Button>
        </div>
      )}
      {status === "unauthenticated" && (
        <div className="mb-6 rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          <Link href="/auth" className="text-acc">
            Log in
          </Link>{" "}
          to leave a comment.
        </div>
      )}

      {loadStatus === "loading" && <Text variant="secondary">Loading comments…</Text>}
      {loadStatus === "error" && (
        <Text className="text-[#ff6b6b]">Couldn&apos;t load comments. Try again later.</Text>
      )}
      {loadStatus === "ready" && comments.length === 0 && (
        <Text variant="secondary">No comments yet.</Text>
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
          <Button variant="secondary" disabled={loadingMore} onClick={handleLoadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>}
        </div>
      )}
    </section>
  );
}
