"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/src/shared/components/Modal";
import {
  Dropdown,
  type DropdownOption,
} from "@/src/shared/components/Dropdown";
import { Textarea } from "@/src/shared/components/Textarea";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { CommentAction } from "@/src/shared/components/CommentCard";
import type { CommentRowVariant } from "@/src/shared/components/CommentCard";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { REPORT_REASON_LABELS } from "@/src/shared/lib/report-reasons";

const USER_REPORT_REASONS = Object.keys(REPORT_REASON_LABELS.user);

/** Enough of the comment for a moderator to find it, without pasting an essay. */
const QUOTE_MAX = 280;

/**
 * "Report" under a comment.
 *
 * ⚠ The backend's `REPORT_TYPES` are `pack | user | round` — there is no
 * `comment` type — so this files a **user** report against the comment's author
 * and quotes the comment in the details, which is the only report a moderator
 * can actually action today. A first-class comment report needs the type added
 * in velanto-backend (reasons, queue rendering, ReportedContentPreview) before
 * this can target the comment itself.
 *
 * A 409 ("already reported") is treated as SUCCESS, same as
 * {@link ReportPackDialog}: it means the caller is already in the reported
 * state, which is what the trigger then shows.
 */
export function ReportCommentAction({
  commentId,
  authorId,
  authorUsername,
  body,
  variant = "root",
}: {
  commentId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  variant?: CommentRowVariant;
}) {
  const t = useTranslations("pack.report");
  const tComment = useTranslations("pack.reportComment");
  const tAuth = useTranslations("authGate");
  const { user } = useAuth();
  // You can't report yourself, and a signed-out visitor can't report at all.
  const blocked = user === null;
  const isOwn = user?.id === authorId;

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [reported, setReported] = useState(false);

  if (isOwn) return null;

  function openDialog() {
    if (blocked || reported) return;
    setError(false);
    // Seed the details with the comment so the moderator sees which one this is
    // about — the report itself can only point at the author.
    setComment(
      tComment("quote", {
        id: commentId,
        body: body.slice(0, QUOTE_MAX),
      }),
    );
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason || submitting) return;
    setError(false);
    setSubmitting(true);
    try {
      await reportsClient.create({
        type: "user",
        targetId: authorId,
        reason,
        comment: comment.trim() || undefined,
      });
      setReported(true);
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setReported(true);
        setOpen(false);
      } else {
        setError(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const reasonOptions: DropdownOption<string>[] = USER_REPORT_REASONS.map(
    (id) => ({ value: id, label: tComment(`reasons.${id}`) }),
  );

  const trigger = (
    <CommentAction
      variant={variant}
      aria-disabled={blocked || reported || undefined}
      onClick={openDialog}
      className={
        reported
          ? "text-danger"
          : blocked
            ? "cursor-not-allowed opacity-50"
            : "hover:text-danger"
      }
    >
      {reported ? t("buttonReported") : t("button")}
    </CommentAction>
  );

  const gated: ReactElement = blocked ? (
    <Tooltip content={tAuth("logInToReport")}>{trigger}</Tooltip>
  ) : (
    trigger
  );

  return (
    <>
      {gated}
      <Modal
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false);
        }}
        title={tComment("title", { username: authorUsername })}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Text variant="tertiary" className="text-xs leading-[1.5]">
            {tComment("scopeNote")}
          </Text>
          {/* A div, not a <label>: the control is a button-based listbox, and a
              <label> wrapping it would make every click on the label text
              re-trigger the button. `ariaLabel` carries the name instead. */}
          <div className="flex flex-col gap-1.5">
            <Text variant="secondary" className="text-sm">
              {t("reasonLabel")}
            </Text>
            <Dropdown
              value={reason}
              onChange={setReason}
              options={reasonOptions}
              placeholder={t("reasonPlaceholder")}
              ariaLabel={t("reasonLabel")}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <Text variant="secondary" className="text-sm">
              {t("commentLabel")}
            </Text>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              maxLength={500}
              rows={4}
            />
          </label>
          {error && (
            <Text variant="danger" className="text-sm">
              {t("error")}
            </Text>
          )}
          <Button
            type="submit"
            variant="danger"
            loading={submitting}
            disabled={!reason}
            className="self-end"
          >
            {t("submit")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
