"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
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
}: {
  packId: string;
  packAuthorId: string;
}) {
  const t = useTranslations("pack");
  const router = useRouter();
  const { user } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = !!user && user.id === packAuthorId;
  const canDelete = !!user && (user.id === packAuthorId || isStaff(user.role));
  if (!canEdit && !canDelete) return null;

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
