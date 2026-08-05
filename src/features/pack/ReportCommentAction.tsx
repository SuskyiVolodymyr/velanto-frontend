"use client";

import { SignInGate } from "@/src/shared/components/SignInGate";
import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { ReportModal } from "@/src/shared/components/ReportModal";
import type { DropdownOption } from "@/src/shared/components/Dropdown";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { CommentAction } from "@/src/shared/components/CommentCard";
import type { CommentRowVariant } from "@/src/shared/components/CommentCard";
import { useAuth } from "@/src/shared/lib/auth-context";
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
  const t = useTranslations("report");
  const tComment = useTranslations("pack.reportComment");
  const tAuth = useTranslations("authGate");
  const { user } = useAuth();
  // You can't report yourself, and a signed-out visitor can't report at all.
  const blocked = user === null;
  const isOwn = user?.id === authorId;

  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  if (isOwn) return null;

  function openDialog() {
    if (blocked || reported) return;
    setOpen(true);
  }

  const reasonOptions: DropdownOption<string>[] = USER_REPORT_REASONS.map(
    (id) => ({ value: id, label: t(`userReasons.${id}`) }),
  );

  const trigger = (
    <CommentAction
      variant={variant}
      aria-disabled={blocked || reported || undefined}
      onClick={openDialog}
      // `blocked` gets the ordinary hover treatment, not a dimmed dead-end
      // look: clicking it opens the sign-in prompt, so it IS interactive.
      // `reported` stays distinct — that one really is finished.
      className={reported ? "text-danger" : "hover:text-danger"}
    >
      {reported ? t("buttonReported") : t("button")}
    </CommentAction>
  );

  const gated: ReactElement = blocked ? (
    <SignInGate message={tAuth("logInToReport")}>{trigger}</SignInGate>
  ) : (
    trigger
  );

  return (
    <>
      {gated}
      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        onReported={() => {
          setReported(true);
          setOpen(false);
        }}
        title={t("userTitle", { username: authorUsername })}
        note={tComment("scopeNote")}
        reportType="user"
        targetId={authorId}
        reasons={reasonOptions}
        // Seed the details with the comment so the moderator sees which one
        // this is about — the report itself can only point at the author.
        initialComment={tComment("quote", {
          id: commentId,
          body: body.slice(0, QUOTE_MAX),
        })}
      />
    </>
  );
}
