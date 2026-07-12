"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFeedback } from "@/src/features/feedback/api/feedback-detail.queries";
import {
  useSetFeedbackStatus,
  useDeleteFeedback,
} from "@/src/features/feedback/api/feedback-detail.mutations";
import { ApiError } from "@/src/shared/lib/api-client";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { TOPIC_KEYS } from "@/src/features/feedback/FeedbackCard";
import { FeedbackVote } from "@/src/features/feedback/FeedbackVote";
import { FeedbackComments } from "@/src/features/feedback/FeedbackComments";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import { LOCALE_NAMES, type Locale } from "@/src/i18n/config";

// status value → key in the shared `status` ns (matches the badge labels).
const STATUS_OPTIONS: { value: FeedbackStatus; key: string }[] = [
  { value: "new", key: "feedbackNew" },
  { value: "in_progress", key: "feedbackInProgress" },
  { value: "done", key: "feedbackDone" },
  { value: "declined", key: "feedbackDeclined" },
];

export function FeedbackDetailScreen({ postId }: { postId: string }) {
  const t = useTranslations("feedback");
  const tStatus = useTranslations("status");
  const { user } = useAuth();
  const router = useRouter();

  const postQuery = useFeedback(postId);
  const post = postQuery.data;
  // A 404 covers both a deleted post and a hidden staff_only one the viewer
  // isn't allowed to see — surface a friendly not-found in either case.
  const isNotFound =
    postQuery.error instanceof ApiError && postQuery.error.status === 404;

  const statusMutation = useSetFeedbackStatus(postId);
  const statusBusy = statusMutation.isPending;
  const statusError = statusMutation.isError ? t("statusUpdateError") : "";

  const deleteMutation = useDeleteFeedback(postId);
  const deleteError = deleteMutation.isError ? t("deleteError") : "";

  function handleStatusChange(next: FeedbackStatus) {
    statusMutation.mutate(next);
  }

  function handleDelete() {
    if (!window.confirm(t("deleteConfirm"))) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => router.push("/feedback"),
    });
  }

  if (postQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-7 py-10">
        <Text variant="secondary">{t("loading")}</Text>
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("detailNotFound")}</Text>
        <Link
          href="/feedback"
          className="mt-4 inline-block text-acc hover:underline"
        >
          {t("backToFeedback")}
        </Link>
      </main>
    );
  }

  if (postQuery.error || !post) {
    return (
      <main className="mx-auto max-w-md py-16 text-center">
        <Text className="text-danger">{t("detailLoadError")}</Text>
        <Link
          href="/feedback"
          className="mt-4 inline-block text-acc hover:underline"
        >
          {t("backToFeedback")}
        </Link>
      </main>
    );
  }

  const isStaff =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";
  const canDelete = isStaff || user?.id === post.authorId;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t(TOPIC_KEYS[post.topic])}</Badge>
        <StatusBadge kind="feedback" status={post.status} />
      </div>

      <Text as="h1" variant="title" className="text-2xl">
        {post.title}
      </Text>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Text variant="tertiary" as="span">
          {t("by")}{" "}
          <Hidden kind="name" id={post.authorId}>
            <Username
              username={post.authorUsername}
              role={post.authorRole}
              trusted={post.authorTrusted}
            />
          </Hidden>
        </Text>
        <Text variant="tertiary">
          · {new Date(post.createdAt).toLocaleString()}
        </Text>
        {post.updatedAt !== post.createdAt && (
          <Text variant="tertiary">
            · {t("edited")} {new Date(post.updatedAt).toLocaleString()}
          </Text>
        )}
      </div>

      <Text variant="secondary" className="whitespace-pre-wrap">
        {post.body}
      </Text>

      {post.topic === "translation" && (
        <div className="flex flex-col gap-2 rounded-[15px] border border-border bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            {t("translationHeading")}
          </Text>
          {post.locale && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">
                {t("languageValueLabel")}
              </span>{" "}
              {LOCALE_NAMES[post.locale as Locale] ?? post.locale}
            </Text>
          )}
          {post.translationContext && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">
                {t("contextValueLabel")}
              </span>{" "}
              {post.translationContext}
            </Text>
          )}
          {post.translationSuggestion && (
            <Text variant="secondary" className="text-sm">
              <span className="font-semibold text-foreground">
                {t("suggestionValueLabel")}
              </span>{" "}
              {post.translationSuggestion}
            </Text>
          )}
        </div>
      )}

      <FeedbackVote
        feedbackId={post.id}
        initialLikes={post.likes}
        initialDislikes={post.dislikes}
        initialMyVote={post.myVote}
      />

      {(isStaff || canDelete) && (
        <div className="flex flex-wrap items-center gap-3 rounded-[15px] border border-border bg-surface p-5">
          {isStaff && (
            <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
              {t("statusSelectLabel")}
              <select
                value={post.status}
                disabled={statusBusy}
                onChange={(e) =>
                  handleStatusChange(e.target.value as FeedbackStatus)
                }
                aria-label={t("statusSelectLabel")}
                className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground disabled:opacity-45"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {tStatus(o.key)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {statusBusy && (
            <Text variant="tertiary" className="text-xs">
              {t("saving")}
            </Text>
          )}
          {statusError && (
            <Text className="text-xs text-danger">{statusError}</Text>
          )}
          {canDelete && (
            <Button
              variant="secondary"
              className="ml-auto"
              onClick={handleDelete}
            >
              {t("delete")}
            </Button>
          )}
          {deleteError && (
            <Text className="text-xs text-danger">{deleteError}</Text>
          )}
        </div>
      )}

      <FeedbackComments feedbackId={post.id} />
    </main>
  );
}
