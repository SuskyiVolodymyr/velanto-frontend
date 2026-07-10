"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { cn } from "@/src/shared/lib/cn";

function Arrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? (
        <path d="M12 19V5M6 11l6-6 6 6" />
      ) : (
        <path d="M12 5v14M6 13l6 6 6-6" />
      )}
    </svg>
  );
}

// Compact up / score / down voter. The net score (likes − dislikes) sits
// between the arrows; the arrow matching your vote lights up (accent for up,
// red for down).
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
  const t = useTranslations("pack");
  const router = useRouter();
  const pathname = usePathname();

  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const score = likes - dislikes;

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
      setError(t("voteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-white/[0.03] p-1">
        <button
          type="button"
          aria-label={t("upvote")}
          aria-pressed={myVote === 1}
          disabled={busy}
          onClick={() => void handleVote(1)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
            myVote === 1
              ? "text-acc"
              : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
          )}
        >
          <Arrow direction="up" />
        </button>
        <span
          className={cn(
            "min-w-[1.75rem] text-center text-sm font-semibold tabular-nums",
            myVote === 1
              ? "text-acc"
              : myVote === -1
                ? "text-[#ff6b6b]"
                : "text-foreground",
          )}
        >
          {score}
        </span>
        <button
          type="button"
          aria-label={t("downvote")}
          aria-pressed={myVote === -1}
          disabled={busy}
          onClick={() => void handleVote(-1)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
            myVote === -1
              ? "text-[#ff6b6b]"
              : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
          )}
        >
          <Arrow direction="down" />
        </button>
      </div>
      {error && <span className="text-xs text-[#ff6b6b]">{error}</span>}
    </div>
  );
}
