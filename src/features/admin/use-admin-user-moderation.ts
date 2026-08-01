"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import { adminUserDetailQueryOptions } from "@/src/features/admin/api/admin.queries";
import type { BanDuration } from "@/src/shared/lib/users-client";

export interface AdminUserModeration {
  showBanForm: boolean;
  banDuration: BanDuration;
  setBanDuration: (duration: BanDuration) => void;
  banReason: BanReasonState;
  setBanReason: (next: BanReasonState) => void;
  actionError: string;
  /** True while the ban request is in flight — mirrors useAuthorModeration's
   * banSubmitting: drives the submit button's spinner and blocks a
   * re-entrant double-ban. */
  banSubmitting: boolean;
  unbanSubmitting: boolean;
  trustSubmitting: boolean;
  /** Toggles the inline ban form, resetting duration + reason when opening. */
  toggleBanForm: () => void;
  handleBanSubmit: () => Promise<void>;
  handleUnban: () => Promise<void>;
  handleSetTrusted: (trusted: boolean) => Promise<void>;
}

/**
 * Owns the moderator ban/trust state for {@link AdminUserDetailScreen}'s hero
 * actions. Mirrors {@link useAuthorModeration}'s inline-ban-form shape (same
 * duration/reason state, same toggle/submit contract) but additionally owns
 * `setTrusted` and plain `unban` — only staff visit this screen, so trust
 * surfaces as a first-class action here the way it doesn't on the public
 * author page. Every action invalidates this screen's own
 * `adminUserDetailQueryOptions` query key on success, rather than holding
 * local banned/trusted state, so the hero's Active/Banned pill and trust
 * badge update from the refetched detail record without a manual reload.
 */
export function useAdminUserModeration(userId: string): AdminUserModeration {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });
  const [actionError, setActionError] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);
  const [trustSubmitting, setTrustSubmitting] = useState(false);

  function invalidateDetail() {
    return queryClient.invalidateQueries({
      queryKey: adminUserDetailQueryOptions(userId).queryKey,
    });
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
    if (banSubmitting || !isBanReasonValid(banReason)) return;
    setActionError("");
    setBanSubmitting(true);
    try {
      await usersClient.ban(userId, {
        duration: banDuration,
        ...buildBanReasonPayload(banReason),
      });
      setShowBanForm(false);
      setBanReason({ reason: "", reasonDetail: "" });
      await invalidateDetail();
    } catch {
      setActionError(t("banUserError"));
    } finally {
      setBanSubmitting(false);
    }
  }

  async function handleUnban() {
    if (unbanSubmitting) return;
    setActionError("");
    setUnbanSubmitting(true);
    try {
      await usersClient.unban(userId);
      await invalidateDetail();
    } catch {
      setActionError(t("unbanUserError"));
    } finally {
      setUnbanSubmitting(false);
    }
  }

  async function handleSetTrusted(trusted: boolean) {
    if (trustSubmitting) return;
    setActionError("");
    setTrustSubmitting(true);
    try {
      await usersClient.setTrusted(userId, trusted);
      await invalidateDetail();
    } catch {
      setActionError(trusted ? t("trustError") : t("untrustError"));
    } finally {
      setTrustSubmitting(false);
    }
  }

  return {
    showBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    actionError,
    banSubmitting,
    unbanSubmitting,
    trustSubmitting,
    toggleBanForm,
    handleBanSubmit,
    handleUnban,
    handleSetTrusted,
  };
}
