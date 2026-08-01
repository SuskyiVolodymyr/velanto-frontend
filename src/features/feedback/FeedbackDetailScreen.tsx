"use client";
import { formatDateTime } from "@/src/shared/lib/format-date";

import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";
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
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Username } from "@/src/shared/components/Username";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { Dropdown } from "@/src/shared/components/Dropdown";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { TOPIC_KEYS } from "@/src/features/feedback/FeedbackCard";
import { FeedbackVote } from "@/src/features/feedback/FeedbackVote";
import { FeedbackComments } from "@/src/features/feedback/FeedbackComments";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import { LOCALE_NAMES, type Locale } from "@/src/i18n/config";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

// status value → key in the shared `status` ns (matches the badge labels).
const STATUS_OPTIONS: { value: FeedbackStatus; key: string }[] = [
  { value: "new", key: "feedbackNew" },
  { value: "in_progress", key: "feedbackInProgress" },
  { value: "done", key: "feedbackDone" },
  { value: "declined", key: "feedbackDeclined" },
];

/** One `Label: value` line in the pink translation panel. */
function TranslationRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[13.5px] leading-[1.6] text-foreground-secondary">
      <span className="font-[650] text-foreground">{label}</span> {value}
    </span>
  );
}

export function FeedbackDetailScreen({ postId }: { postId: string }) {
  const t = useTranslations("feedback");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    deleteMutation.mutate(undefined, {
      onSuccess: () => router.push("/feedback"),
    });
  }

  if (postQuery.isLoading) {
    return (
      <>
        <PageHeader
          back={{ href: "/feedback", label: t("backToFeedback") }}
          crumb={t("detailCrumb")}
        />
        <main className={cn(pageContainer(720), "py-10")}>
          <LoadingState label={t("loading")} showLabel />
        </main>
      </>
    );
  }

  if (isNotFound) {
    return (
      <>
        <PageHeader
          back={{ href: "/feedback", label: t("backToFeedback") }}
          crumb={t("detailCrumb")}
        />
        <main className="mx-auto max-w-md py-16 text-center">
          <Text variant="secondary">{t("detailNotFound")}</Text>
          <Link
            href="/feedback"
            className="mt-4 inline-block text-acc hover:underline"
          >
            {t("backToFeedback")}
          </Link>
        </main>
      </>
    );
  }

  if (postQuery.error || !post) {
    return (
      <>
        <PageHeader
          back={{ href: "/feedback", label: t("backToFeedback") }}
          crumb={t("detailCrumb")}
        />
        <main className="mx-auto max-w-md py-16 text-center">
          <Text variant="danger">{t("detailLoadError")}</Text>
          <Link
            href="/feedback"
            className="mt-4 inline-block text-acc hover:underline"
          >
            {t("backToFeedback")}
          </Link>
        </main>
      </>
    );
  }

  const isStaff =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";
  const canDelete = isStaff || user?.id === post.authorId;

  return (
    <>
      <PageHeader
        back={{ href: "/feedback", label: t("backToFeedback") }}
        crumb={t("detailCrumb")}
      />
      <main
        className={cn(
          pageContainer(720),
          "flex flex-1 flex-col gap-[22px] pt-7 pb-[70px]",
        )}
      >
        <div className="flex flex-wrap items-center gap-[9px]">
          <span className="inline-flex items-center rounded-chip border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-foreground-secondary">
            {t(TOPIC_KEYS[post.topic])}
          </span>
          <StatusBadge kind="feedback" status={post.status} />
          {/* Only the author and staff can see a staff_only post at all, so
              this says "this isn't public" to the two audiences who need it. */}
          {post.visibility === "staff_only" && (
            <span className="inline-flex items-center gap-1.5 rounded-chip border border-[rgba(168,85,247,0.35)] bg-[rgba(168,85,247,0.1)] px-2.5 py-1 text-xs font-medium text-[#D8A6FF]">
              <Lock aria-hidden size={12} strokeWidth={2} />
              {t("visibilityStaffOnly")}
            </span>
          )}
        </div>

        <h1 className="text-[25px] font-bold leading-[1.25] tracking-[-0.02em] text-foreground">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-[7px] text-xs text-foreground-tertiary">
          <span>{t("by")}</span>
          <Hidden kind="name" id={post.authorId}>
            <Link
              href={`/users/${post.authorId}`}
              className="hover:underline"
              prefetch={false}
            >
              <Username
                username={post.authorUsername}
                role={post.authorRole}
                trusted={post.authorTrusted}
                at
              />
            </Link>
          </Hidden>
          <span>· {formatDateTime(post.createdAt)}</span>
          {post.updatedAt !== post.createdAt && (
            <span>
              · {t("edited")} {formatDateTime(post.updatedAt)}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground-secondary">
          {post.body}
        </p>

        {post.topic === "translation" && (
          <div className="flex flex-col gap-2.5 rounded-[15px] border border-[rgba(255,92,192,0.26)] bg-surface-card p-[18px]">
            <span className="text-[11px] font-[650] uppercase tracking-[0.08em] text-[#FF8BD1]">
              {t("translationHeading")}
            </span>
            {post.locale && (
              <TranslationRow
                label={t("languageValueLabel")}
                value={LOCALE_NAMES[post.locale as Locale] ?? post.locale}
              />
            )}
            {post.translationContext && (
              <TranslationRow
                label={t("contextValueLabel")}
                value={post.translationContext}
              />
            )}
            {post.translationSuggestion && (
              <TranslationRow
                label={t("suggestionValueLabel")}
                value={post.translationSuggestion}
              />
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
          <div className="flex flex-wrap items-end gap-3.5 rounded-[15px] border border-white/[0.07] bg-surface-card px-[18px] py-4 max-[620px]:flex-col max-[620px]:items-stretch">
            {isStaff && (
              // A div rather than a <label>: the Dropdown's control is a button,
              // and a wrapping label would re-trigger it on every label click.
              <div className="flex flex-col gap-[7px]">
                <span className="text-[11.5px] text-foreground-secondary">
                  {t("statusSelectLabel")}
                </span>
                <Dropdown<FeedbackStatus>
                  className="w-[180px] max-[620px]:w-full"
                  value={post.status}
                  disabled={statusBusy}
                  onChange={handleStatusChange}
                  ariaLabel={t("statusSelectLabel")}
                  options={STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: tStatus(o.key),
                  }))}
                />
              </div>
            )}
            {statusBusy && (
              <Text variant="tertiary" className="text-xs">
                {t("saving")}
              </Text>
            )}
            {statusError && (
              <Text variant="danger" className="text-xs">
                {statusError}
              </Text>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                className="ms-auto max-[620px]:ms-0"
                onClick={() => setConfirmingDelete(true)}
              >
                {t("delete")}
              </Button>
            )}
          </div>
        )}

        {/* An inline confirm strip rather than window.confirm: a native dialog
            can't be styled, can't be dismissed by keyboard-trap rules the rest
            of the app follows, and can't be asserted on in a test. */}
        {confirmingDelete && (
          <div className="flex flex-wrap items-center gap-[11px] rounded-[13px] border border-danger/30 bg-danger/[0.06] px-4 py-3.5">
            <span className="text-[13.5px] font-semibold text-[#ff8c8c]">
              {t("deleteConfirm")}
            </span>
            <div className="ms-auto flex gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {t("delete")}
              </Button>
            </div>
            {deleteError && (
              <Text variant="danger" className="w-full text-xs">
                {deleteError}
              </Text>
            )}
          </div>
        )}

        <FeedbackComments feedbackId={post.id} />
      </main>
    </>
  );
}
