"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Send, Trash2 } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import type { PackStatus } from "@/src/shared/types/pack";
import { useAuth } from "@/src/shared/lib/auth-context";
import { isStaff } from "@/src/shared/lib/user-role";
import { packsClient } from "@/src/shared/lib/packs-client";
import { buttonClassName } from "@/src/shared/components/Button";
import { Button } from "@/src/shared/components/Button";
import { ConfirmModal } from "@/src/shared/components/ConfirmModal";

/**
 * Author/moderator actions on a pack detail page. The author sees Edit + Delete;
 * a moderator+ who isn't the author sees Delete only (they can remove any pack
 * but not rewrite it). Everyone else — including signed-out visitors — gets
 * nothing. All of this is UX gating only; the backend independently enforces
 * the same rules on PATCH/DELETE.
 */
export function PackOwnerActions({
  packId,
  packAuthorId,
  packStatus,
}: {
  packId: string;
  packAuthorId: string;
  /** Drives the Submit action, which only exists for a draft. */
  packStatus?: PackStatus;
}) {
  const t = useTranslations("pack");
  const router = useRouter();
  const { user } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept separate from `error`, which is rendered inside the delete modal — a
  // failed submit has no modal to show it in.
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canEdit = !!user && user.id === packAuthorId;
  const canDelete = !!user && (user.id === packAuthorId || isStaff(user.role));
  // Only the author can publish, and only from a draft.
  const canSubmit = canEdit && packStatus === "draft";
  if (!canEdit && !canDelete) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await packsClient.submit(packId);
      // Status changed (draft → pending, or approved for trusted/staff), so
      // re-render the server component to pick up the new badge and actions.
      router.refresh();
    } catch {
      setSubmitError(t("submitPackError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await packsClient.delete(packId);
      // The pack is gone — leave the (now-404) detail page and refresh so any
      // cached feed/list drops it.
      router.push("/");
      router.refresh();
    } catch {
      setError(t("deletePackError"));
      setDeleting(false);
    }
  }

  return (
    <>
      {canEdit && (
        <Link
          href={`/packs/${packId}/edit`}
          className={buttonClassName("secondary", "gap-2")}
        >
          <Pencil size={16} aria-hidden />
          {t("edit")}
        </Link>
      )}
      {canSubmit && (
        <Button className="gap-2" onClick={handleSubmit} disabled={submitting}>
          <Send size={16} aria-hidden />
          {submitting ? t("submittingPack") : t("submitPack")}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="danger"
          className="gap-2"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
        >
          <Trash2 size={16} aria-hidden />
          {t("delete")}
        </Button>
      )}

      {submitError && (
        <Text variant="danger" className="w-full text-sm">
          {submitError}
        </Text>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t("deletePackTitle")}
        message={t("deletePackConfirm")}
        confirmLabel={deleting ? t("deleting") : t("deletePackCta")}
        cancelLabel={t("cancel")}
        confirming={deleting}
        error={error}
      />
    </>
  );
}
