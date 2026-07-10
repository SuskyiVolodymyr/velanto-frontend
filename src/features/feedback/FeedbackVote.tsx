"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

export function FeedbackVote({
  feedbackId,
  initialScore,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  feedbackId: string;
  initialScore: number;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const t = useTranslations("feedback");
  const { status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [score, setScore] = useState(initialScore);
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
      const result = await feedbackClient.vote(feedbackId, value);
      setScore(result.score);
      setLikes(result.likes);
      setDislikes(result.dislikes);
      setMyVote(result.myVote);
    } catch {
      setError(t("voteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex flex-col items-center rounded-[8px] bg-white/[0.04] px-3 py-1.5">
        <span className="text-base font-semibold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary">
          {t("scoreLabel")}
        </span>
      </span>
      <Button
        variant={myVote === 1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(1)}
      >
        {t("like")} <span>{likes}</span>
      </Button>
      <Button
        variant={myVote === -1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(-1)}
      >
        {t("dislike")} <span>{dislikes}</span>
      </Button>
      {error && <Text className="text-xs text-[#ff6b6b]">{error}</Text>}
    </div>
  );
}
