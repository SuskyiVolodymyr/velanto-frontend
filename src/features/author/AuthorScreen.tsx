"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { Text } from "@/src/shared/components/Text";
import { AuthorProfileHeader } from "./AuthorProfileHeader";
import { AuthorPackList } from "./AuthorPackList";
import { AuthorModeratorPanel } from "./AuthorModeratorPanel";
import { useAuthorModeration } from "./use-author-moderation";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

export interface AuthorData {
  profile: PublicUserProfile;
  packs: Pack[];
  packsTotal: number;
}

export function AuthorScreen({
  authorId,
  initialData,
}: {
  authorId: string;
  /**
   * Server-seeded public profile + first page of packs. When present the
   * screen renders immediately server-side (indexable) and skips the mount
   * fetch; viewer-specific fields (isFollowedByMe) refresh only on a later
   * follow action / authorId change. Omitted → full client-fetch path.
   */
  initialData?: AuthorData;
}) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Loading/error/data for the profile+packs fetch is owned by useClientData,
  // which aborts the in-flight request on unmount / authorId change — that
  // determinism is what stabilises this screen's test (#78).
  const authorQuery = useClientData<AuthorData>(
    async () => {
      const [profile, packs] = await Promise.all([
        usersClient.getProfile(authorId),
        packsClient.list({ authorId, limit: 50 }),
      ]);
      return { profile, packs: packs.items, packsTotal: packs.total };
    },
    [authorId],
    { initialData },
  );

  const isOwnProfile = authStatus === "authenticated" && user?.id === authorId;
  const isModeratorPlus = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";
  const showModeratorTools = isModeratorPlus && !isOwnProfile;

  // Ban history is a second, gated fetch: only for a moderator viewing someone
  // else's page, and only once the profile itself has loaded.
  const banHistoryQuery = useClientData(
    () => usersClient.banHistory(authorId, { page: 1, limit: 20 }),
    [authorId],
    { enabled: showModeratorTools && authorQuery.data !== null },
  );

  // Rule categories resolve each ban-history entry's reason id (e.g.
  // `spam_manipulation`) to its human title, shared with the ban picker below.
  // Gated to the moderator view so a plain visitor never triggers the fetch.
  const rulesQuery = useClientData(() => rulesClient.getRules(), [], { enabled: showModeratorTools });
  const ruleCategories = rulesQuery.data?.categories ?? [];

  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");
  const moderation = useAuthorModeration(authorId);

  async function handleFollowToggle() {
    if (authStatus !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const profile = authorQuery.data?.profile;
    if (!profile) return;
    setFollowBusy(true);
    setFollowError("");
    try {
      const result = profile.isFollowedByMe
        ? await usersClient.unfollow(authorId)
        : await usersClient.follow(authorId);
      authorQuery.setData((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, isFollowedByMe: !prev.profile.isFollowedByMe, followerCount: result.followerCount },
            }
          : prev,
      );
    } catch {
      setFollowError("Couldn't update follow status. Try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  if (authorQuery.loading) return null;

  if (authorQuery.error || !authorQuery.data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This user doesn&apos;t exist.</Text>
      </div>
    );
  }

  const { profile, packs, packsTotal } = authorQuery.data;

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <AuthorProfileHeader
        authorId={authorId}
        profile={profile}
        packsTotal={packsTotal}
        isOwnProfile={isOwnProfile}
        followBusy={followBusy}
        followError={followError}
        onFollowToggle={() => void handleFollowToggle()}
      />

      {showModeratorTools && (
        <AuthorModeratorPanel
          authorId={authorId}
          moderation={moderation}
          banHistoryQuery={banHistoryQuery}
          ruleCategories={ruleCategories}
        />
      )}

      <AuthorPackList packs={packs} />
    </div>
  );
}
