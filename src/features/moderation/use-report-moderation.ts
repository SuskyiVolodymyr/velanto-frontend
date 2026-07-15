"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import { useModerationInvalidation } from "@/src/features/moderation/api/moderation.queries";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import type { ReportWithReporter } from "@/src/shared/types/report";

/**
 * Owns the moderation-action state for a single report detail: the pack-delete
 * flow and the inline ban-user form (duration + reason). Kept out of
 * ReportDetailScreen so the screen stays a thin orchestrator, mirroring
 * use-author-moderation. The queue actions (review/close) stay in the screen
 * because they patch the report query's cached data.
 */
export function useReportModeration(report: ReportWithReporter | null) {
  const t = useTranslations("moderation");
  const invalidateQueues = useModerationInvalidation();
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });
  const [banError, setBanError] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banDone, setBanDone] = useState(false);

  async function handleDeletePack() {
    if (!report || deleting) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await packsClient.delete(report.targetId);
      setDeleted(true);
      // A reported pack can also be sitting in the approvals queue. Deleting it
      // here has to clear it from that tab and from the badge, or the moderator
      // goes back to a queue offering them a pack that no longer exists.
      await invalidateQueues();
    } catch {
      setDeleteError(t("deletePackError"));
    } finally {
      setDeleting(false);
    }
  }

  function toggleBanForm() {
    setShowBanForm((v) => {
      const opening = !v;
      if (opening) {
        setBanDuration("week");
        setBanReason({ reason: "", reasonDetail: "" });
      }
      return opening;
    });
  }

  async function handleBanSubmit() {
    if (!report || banSubmitting || !isBanReasonValid(banReason)) return;
    setBanError("");
    setBanSubmitting(true);
    try {
      await usersClient.ban(report.targetId, {
        duration: banDuration,
        ...buildBanReasonPayload(banReason),
      });
      setBanDone(true);
      setShowBanForm(false);
    } catch {
      setBanError(t("banUserError"));
    } finally {
      setBanSubmitting(false);
    }
  }

  return {
    deleted,
    deleting,
    deleteError,
    handleDeletePack,
    showBanForm,
    toggleBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banError,
    banSubmitting,
    banDone,
    handleBanSubmit,
  };
}
