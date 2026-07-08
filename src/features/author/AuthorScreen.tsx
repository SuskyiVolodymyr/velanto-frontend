"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

export function AuthorScreen({ authorId }: { authorId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([usersClient.getProfile(authorId), packsClient.list({ authorId, limit: 50 })])
      .then(([profileResult, packsResult]) => {
        if (cancelled) return;
        setProfile(profileResult);
        setPacks(packsResult.items);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  async function handleFollowToggle() {
    if (authStatus !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!profile) return;
    setFollowBusy(true);
    setFollowError("");
    try {
      const result = profile.isFollowedByMe
        ? await usersClient.unfollow(authorId)
        : await usersClient.follow(authorId);
      setProfile({ ...profile, isFollowedByMe: !profile.isFollowedByMe, followerCount: result.followerCount });
    } catch {
      setFollowError("Couldn't update follow status. Try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  if (status === "loading") return null;

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This user doesn&apos;t exist.</Text>
      </div>
    );
  }

  const initial = profile.username.slice(0, 1).toUpperCase();
  const isOwnProfile = authStatus === "authenticated" && user?.id === authorId;

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xl font-semibold text-foreground-secondary">
            {initial}
          </div>
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              {profile.username}
            </Text>
            <Text variant="tertiary" className="text-sm">
              {profile.followerCount} follower{profile.followerCount === 1 ? "" : "s"} · {packs.length} pack
              {packs.length === 1 ? "" : "s"}
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
