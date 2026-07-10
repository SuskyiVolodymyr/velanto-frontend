"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { ApiError } from "@/src/shared/lib/api-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { TOPIC_LABELS } from "@/src/features/feedback/FeedbackCard";
import { FeedbackVote } from "@/src/features/feedback/FeedbackVote";
import { FeedbackComments } from "@/src/features/feedback/FeedbackComments";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import { LOCALE_NAMES, type Locale } from "@/src/i18n/config";

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Declined" },
];

export function FeedbackDetailScreen({ postId }: { postId: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // postId can change without a remount (e.g. navigating between detail pages);
  // useClientData resets to loading and aborts the previous fetch on change.
  const postQuery = useClientData(() => feedbackClient.getById(postId), [postId]);
  const post = postQuery.data;
  // A 404 covers both a deleted post and a hidden staff_only one the viewer
  // isn't allowed to see — surface a friendly not-found in either case.
  const isNotFound = postQuery.error instanceof ApiError && postQuery.error.status === 404;

  async function handleStatusChange(next: FeedbackStatus) {
    setStatusBusy(true);
    setStatusError("");
    try {
      const updated = await feedbackClient.setStatus(postId, next);
      postQuery.setData((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setStatusError("Couldn't update the status. Try again.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this feedback post?")) return;
    setDeleteError("");
    try {
      await feedbackClient.remove(postId);
      router.push("/feedback");
    } catch {
      setDeleteError("Couldn't delete this post. Try again.");
    }
  }

  if (postQuery.loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-7 py-10">
        <Text variant="secondary">Loading…</Text>
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">This feedback post doesn&apos;t exist or isn&apos;t visible to you.</Text>
        <Link href="/feedback" className="mt-4 inline-block text-acc hover:underline">
          Back to feedback
        </Link>
      </main>
    );
  }

  if (postQuery.error || !post) {
    return (
      <main className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">Couldn&apos;t load this feedback post. Try again.</Text>
        <Link href="/feedback" className="mt-4 inline-block text-acc hover:underline">
          Back to feedback
        </Link>
      </main>
    );
  }

  const isStaff = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";
  const canDelete = isStaff || user?.id === post.authorId;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{TOPIC_LABELS[post.topic]}</Badge>
        <StatusBadge kind="feedback" status={post.status} />
      </div>

      <Text as="h1" variant="title" className="text-2xl">
        {post.title}
      </Text>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Text variant="tertiary">by {post.authorUsername}</Text>
        <Text variant="tertiary">· {new Date(post.createdAt).toLocaleString()}</Text>
        {post.updatedAt !== post.createdAt && (
          <Text variant="tertiary">· edited {new Date(post.updatedAt).toLocaleString()}</Text>
        )}
      </div>

      <Text variant="secondary" className="whitespace-pre-wrap">
        {post.body}
      </Text>

      {post.topic === "translation" && (
        <div className="flex flex-col gap-2 rounded-[15px] border border-border bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            Translation
          </Text>
          {post.locale && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">Language:</span>{" "}
              {LOCALE_NAMES[post.locale as Locale] ?? post.locale}
            </Text>
          )}
          {post.translationContext && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">Context:</span> {post.translationContext}
            </Text>
          )}
          {post.translationSuggestion && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">Suggestion:</span>{" "}
              {post.translationSuggestion}
            </Text>
          )}
        </div>
      )}

      <FeedbackVote
        feedbackId={post.id}
        initialScore={post.score}
        initialLikes={post.likes}
        initialDislikes={post.dislikes}
        initialMyVote={post.myVote}
      />

      {(isStaff || canDelete) && (
        <div className="flex flex-wrap items-center gap-3 rounded-[15px] border border-border bg-surface p-5">
          {isStaff && (
            <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
              Status
              <select
                value={post.status}
                disabled={statusBusy}
                onChange={(e) => void handleStatusChange(e.target.value as FeedbackStatus)}
                aria-label="Status"
                className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground disabled:opacity-45"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {statusBusy && <Text variant="tertiary" className="text-xs">Saving…</Text>}
          {statusError && <Text className="text-xs text-[#ff6b6b]">{statusError}</Text>}
          {canDelete && (
            <Button variant="secondary" className="ml-auto" onClick={() => void handleDelete()}>
              Delete
            </Button>
          )}
          {deleteError && <Text className="text-xs text-[#ff6b6b]">{deleteError}</Text>}
        </div>
      )}

      <FeedbackComments feedbackId={post.id} />
    </main>
  );
}
