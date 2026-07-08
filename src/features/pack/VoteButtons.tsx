"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

export function VoteButtons({
  packId,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  packId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const { status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleVote(value: 1 | -1) {
    if (authStatus !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await packsClient.vote(packId, value);
      setLikes(result.likes);
      setDislikes(result.dislikes);
      setMyVote(result.myVote);
    } catch {
      setError("Couldn't record your vote. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={myVote === 1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(1)}
      >
        Like <span>{likes}</span>
      </Button>
      <Button
        variant={myVote === -1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(-1)}
      >
        Dislike <span>{dislikes}</span>
      </Button>
      {error && (
        <Text className="text-xs text-[#ff6b6b]">{error}</Text>
      )}
    </div>
  );
}
