"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/** Under a minute left — the point at which "plenty of time" stops being true
 * and the clock should start reading as a warning rather than as furniture. */
const URGENT_MS = 60_000;

/**
 * How long the room will wait before resolving a phase without you.
 *
 * Shared by both endgames — Guess-who's assignment and Spy's accusation are the
 * same beat under the same server deadline, and a countdown that looked
 * different in each would read as two different clocks.
 *
 * The deadline is the SERVER's and only the server acts on it; this just draws
 * it, so a client whose clock runs fast reveals nothing early.
 *
 * m:ss rather than raw seconds: this window is minutes long, and "in 287s" is
 * not a length of time anyone reads.
 *
 * Deliberately outside any aria-live region — a per-second tick announced aloud
 * would bury the "N / M have submitted" updates that actually matter. Screen
 * readers still reach it on demand.
 */
export function PhaseDeadline({
  at,
  label,
}: {
  /** Epoch ms, or null when the phase carries no deadline. */
  at: number | null;
  /** "Reveal in" — each phase names its own outcome. */
  label: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (at === null) return;
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      // Stop at the deadline. The screen normally unmounts within a second of
      // it, but a dropped socket keeps the last board mounted under the
      // reconnecting banner — without this it would re-render 4x/s forever,
      // showing a frozen 0:00.
      if (tick >= at) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [at]);

  if (at === null) return null;
  const remaining = Math.max(0, at - now);
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining <= URGENT_MS;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-control border px-3 py-2",
        urgent
          ? "border-danger/30 bg-danger/[0.08]"
          : "border-border bg-white/[0.04]",
      )}
    >
      <Clock
        size={13}
        aria-hidden
        className={cn(
          "flex-none",
          urgent ? "text-danger" : "text-foreground-tertiary",
        )}
      />
      <Text variant="tertiary" className="text-[11.5px] font-semibold">
        {label}
      </Text>
      <span
        className={cn(
          "ms-auto font-mono text-[13px] font-bold tabular-nums",
          urgent ? "text-danger" : "text-foreground-secondary",
        )}
      >
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
