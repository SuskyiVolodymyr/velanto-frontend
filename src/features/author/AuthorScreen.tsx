"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Hidden } from "@/src/shared/components/Hidden";
import { PackCard } from "@/src/features/home/PackCard";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";
import type { BanDuration } from "@/src/shared/lib/users-client";

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

  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState("");
  const [banActionError, setBanActionError] = useState("");
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);

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

  async function handleBanSubmit() {
    if (!banReason.trim()) return;
    setBanActionError("");
    try {
      const result = await usersClient.ban(authorId, { duration: banDuration, reason: banReason.trim() });
      setBannedUntil(result.bannedUntil);
      setShowBanForm(false);
      setBanReason("");
    } catch {
      setBanActionError("Couldn't ban this user. Try again.");
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
  const initial = profile.username.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Hidden kind="avatar" id={authorId} className="h-16 w-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xl font-semibold text-foreground-secondary">
              {initial}
            </div>
          </Hidden>
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              <Hidden kind="name" id={authorId}>
                {profile.username}
              </Hidden>
            </Text>
            <Text variant="tertiary" className="text-sm">
              {profile.followerCount} follower{profile.followerCount === 1 ? "" : "s"} · {packsTotal} pack
              {packsTotal === 1 ? "" : "s"}
            </Text>
          </div>
        </div>
        {!isOwnProfile && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant={profile.isFollowedByMe ? "secondary" : "primary"}
              disabled={followBusy}
              onClick={() => void handleFollowToggle()}
            >
              {profile.isFollowedByMe ? "Following" : "Follow"}
            </Button>
            {followError && <Text className="text-xs text-[#ff6b6b]">{followError}</Text>}
          </div>
        )}
      </div>

      {profile.bio && (
        <div className="mb-10">
          <Text variant="secondary">{profile.bio}</Text>
        </div>
      )}

      {showModeratorTools && (
        <div className="mb-10 rounded-[15px] border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <Text as="h2" variant="title" className="text-lg">
              Moderation
            </Text>
            {!bannedUntil && (
              <Button variant="secondary" onClick={() => setShowBanForm((v) => !v)}>
                Ban
              </Button>
            )}
          </div>
          {bannedUntil && (
            <Text variant="secondary" className="mb-3 text-sm">
              Banned until {new Date(bannedUntil).toLocaleDateString()}.
            </Text>
          )}
          {showBanForm && (
            <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border pb-4">
              <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                Duration
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value as BanDuration)}
                  aria-label="Ban duration"
                  className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                >
                  {BAN_DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason"
                aria-label="Ban reason"
                className="h-9 max-w-xs"
              />
              <Button variant="primary" disabled={!banReason.trim()} onClick={() => void handleBanSubmit()}>
                Confirm ban
              </Button>
              {banActionError && <Text className="text-xs text-[#ff6b6b]">{banActionError}</Text>}
            </div>
          )}
          {banHistoryQuery.loading && <Text variant="secondary">Loading ban history…</Text>}
          {banHistoryQuery.error && <Text className="text-sm text-[#ff6b6b]">Couldn&apos;t load ban history.</Text>}
          {banHistoryQuery.data && banHistoryQuery.data.items.length === 0 && (
            <Text variant="secondary">No ban history for this user.</Text>
          )}
          {banHistoryQuery.data && banHistoryQuery.data.items.length > 0 && (
            <div className="flex flex-col gap-2">
              {banHistoryQuery.data.items.map((entry, i) => (
                <div key={i} className="text-sm">
                  <Text variant="tertiary" className="text-xs">
                    {new Date(entry.createdAt).toLocaleString()}
                  </Text>
                  <Text>
                    <span className="font-semibold">{entry.actorUsername}</span> · {entry.meta.duration} ·{" "}
                    <span className="text-foreground-secondary">{entry.meta.reason}</span>
                  </Text>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Text as="h2" variant="title" className="mb-4 text-lg">
        Packs
      </Text>
      {packs.length === 0 ? (
        <Text variant="secondary">No packs yet.</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
