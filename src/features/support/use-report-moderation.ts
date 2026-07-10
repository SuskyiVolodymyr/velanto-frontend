"use client";

import { useState } from "react";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import type { ReportWithReporter } from "@/src/shared/types/report";

/**
 * Owns the moderation-action state for a single report detail: the pack-delete
 * flow and the inline ban-user form (duration + reason). Kept out of
 * SupportReportScreen so the screen stays a thin orchestrator, mirroring
 * use-author-moderation. The queue actions (review/close) stay in the screen
 * because they patch the report query's cached data.
 */
export function useReportModeration(report: ReportWithReporter | null) {
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });
  const [banError, setBanError] = useState("");
  const [banDone, setBanDone] = useState(false);

  async function handleDeletePack() {
    if (!report) return;
    setDeleteError("");
    try {
      await packsClient.delete(report.targetId);
      setDeleted(true);
    } catch {
      setDeleteError("Couldn't delete this pack. Try again.");
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
    if (!report || !isBanReasonValid(banReason)) return;
    setBanError("");
    try {
      await usersClient.ban(report.targetId, {
        duration: banDuration,
        ...buildBanReasonPayload(banReason),
      });
      setBanDone(true);
      setShowBanForm(false);
    } catch {
      setBanError("Couldn't ban this user. Try again.");
    }
  }

  return {
    deleted,
    deleteError,
    handleDeletePack,
    showBanForm,
    toggleBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banError,
    banDone,
    handleBanSubmit,
  };
}
