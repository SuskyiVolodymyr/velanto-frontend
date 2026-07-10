"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

export function ProfileScreen() {
  const { user, status: authStatus } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    Promise.all([
      usersClient.getProfile(user.id),
      packsClient.list({ authorId: user.id, limit: 50 }),
    ])
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
  }, [authStatus, user]);

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view your profile.
        </Text>
        <Link
          href="/auth?next=%2Fprofile"
          className={buttonClassName("primary", "mt-4 w-fit")}
        >
          Log in
        </Link>
      </div>
    );
  }

  if (status === "loading") return null;

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load your profile. Try again later.
        </Text>
      </div>
    );
  }

  const initial = profile.username.slice(0, 1).toUpperCase();

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
              {profile.followerCount} follower
              {profile.followerCount === 1 ? "" : "s"}
            </Text>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className={buttonClassName("secondary", "w-fit")}
        >
          Edit profile
        </Link>
      </div>

      <div className="mb-10">
        {profile.bio ? (
          <Text variant="secondary">{profile.bio}</Text>
        ) : (
          <Link href="/profile/edit">
            <Text variant="tertiary" className="italic">
              Add a bio to tell people what your packs are about.
            </Text>
          </Link>
        )}
      </div>

      <Text as="h2" variant="title" className="mb-4 text-lg">
        My Packs
      </Text>
      {packs.length === 0 ? (
        <Text variant="secondary">No packs yet — create your first one!</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}
