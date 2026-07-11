"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";

export interface UseFollowActionResult {
  /** True while a follow/unfollow request is in flight. */
  busy: boolean;
  /** Translated error message, or "" when there's nothing to show. */
  error: string;
  /** Toggle follow for the author, given whether the viewer currently follows. */
  toggle: (currentlyFollowing: boolean) => void;
}

/**
 * Owns the follow/unfollow *action* for a single author — the sign-in redirect
 * for anonymous viewers, the API call, and the in-flight/error state — but NOT
 * the displayed follow state. The caller keeps `isFollowedByMe`/`followerCount`
 * in its own source of truth (its fetched profile) and applies the result via
 * `onToggled`, so the state survives both a refetch (AuthorScreen) and an
 * unmounting popover (the pack-page hover card). This is why the state is not
 * held here: a hook-local copy would reset whenever its consumer remounts.
 */
export function useFollowAction(
  authorId: string,
  onToggled: (
    result: { followerCount: number },
    nowFollowing: boolean,
  ) => void,
): UseFollowActionResult {
  const t = useTranslations("profile");
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(currentlyFollowing: boolean) {
    if (status !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = currentlyFollowing
        ? await usersClient.unfollow(authorId)
        : await usersClient.follow(authorId);
      onToggled(result, !currentlyFollowing);
    } catch {
      setError(t("followError"));
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    toggle: (currentlyFollowing) => void run(currentlyFollowing),
  };
}
