"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

const BIO_MAX = 280;

export function ProfileEditForm() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    usersClient
      .getProfile(user.id)
      .then((profile) => {
        if (cancelled) return;
        setBio(profile.bio ?? "");
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load your current bio.");
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await usersClient.updateProfile(bio);
      router.push("/profile");
    } catch {
      setError("Couldn't save your changes. Try again.");
      setPending(false);
    }
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to edit your profile.</Text>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md px-7 py-10">
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        Edit profile
      </Text>

      <label className="mb-2 flex items-center justify-between">
        <Text variant="secondary" className="text-xs">
          Bio
        </Text>
        <Text variant="tertiary" className="text-xs">
          {bio.length}/{BIO_MAX}
        </Text>
      </label>
      <textarea
        value={bio}
        onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX))}
        maxLength={BIO_MAX}
        rows={4}
        placeholder="Tell people what your packs are about."
        className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      />

      {error && <Text className="mt-3 text-sm text-[#ff6b6b]">{error}</Text>}

      <Button type="submit" disabled={pending} className="mt-6 w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
