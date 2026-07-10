"use client";

import { useState } from "react";
import { usersClient } from "@/src/shared/lib/users-client";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import type { BanDuration } from "@/src/shared/lib/users-client";

export interface AuthorModeration {
  showBanForm: boolean;
  banDuration: BanDuration;
  setBanDuration: (duration: BanDuration) => void;
  banReason: BanReasonState;
  setBanReason: (next: BanReasonState) => void;
  banActionError: string;
  bannedUntil: string | null;
  /** Toggles the inline ban form, resetting duration + reason when opening. */
  toggleBanForm: () => void;
  handleBanSubmit: () => Promise<void>;
}

/**
 * Owns the moderator ban state + submit for {@link AuthorModeratorPanel}: the
 * inline form's open/duration/reason fields, the post-ban status, and the
 * `POST /users/:id/ban` call. Kept as a hook (not inline in the panel) so the
 * ban state lives at the screen level with a stable lifecycle, exactly as it
 * did before this screen was decomposed.
 */
export function useAuthorModeration(authorId: string): AuthorModeration {
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({ reason: "", reasonDetail: "" });
  const [banActionError, setBanActionError] = useState("");
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);

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
    if (!isBanReasonValid(banReason)) return;
    setBanActionError("");
    try {
      const result = await usersClient.ban(authorId, {
        duration: banDuration,
        ...buildBanReasonPayload(banReason),
      });
      setBannedUntil(result.bannedUntil);
      setShowBanForm(false);
      setBanReason({ reason: "", reasonDetail: "" });
    } catch {
      setBanActionError("Couldn't ban this user. Try again.");
    }
  }

  return {
    showBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banActionError,
    bannedUntil,
    toggleBanForm,
    handleBanSubmit,
  };
}
