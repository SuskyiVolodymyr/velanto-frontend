"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { commentsClient } from "@/src/shared/lib/comments-client";
import type { Comment } from "@/src/shared/types/comment";

export function CommentSection({ packId }: { packId: string }) {
  const { status } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    let cancelled = false;
    commentsClient
      .list(packId)
      .then((result) => {
        if (cancelled) return;
        setComments(result);
        setLoadStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [packId]);

  async function handlePost() {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const created = await commentsClient.create(packId, { body });
      setComments((prev) => [created, ...prev]);
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
        Comments · {comments.length}
      </Text>

      {status === "authenticated" && (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share your thoughts on this pack…"
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
              <Text className="text-sm font-semibold">{comment.authorUsername}</Text>
              <Text variant="secondary" className="text-sm">
                {comment.body}
              </Text>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
