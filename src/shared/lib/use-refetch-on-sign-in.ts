"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";

/**
 * Refetch a viewer-specific query the moment the session finishes resolving to
 * "authenticated" after a hard refresh.
 *
 * On a full page load the in-memory access token is briefly null while
 * AuthProvider re-establishes the session, so any query that fires in that
 * window goes out ANONYMOUSLY — a feedback post or comment comes back with
 * `myVote: null`, and the viewer's like renders grey even though they voted.
 * The query key deliberately omits the viewer (so the optimistic mutations that
 * `setQueryData` by key keep working), which also means React Query won't
 * refetch on its own once the token arrives. This bridges that gap.
 *
 * It fires only for the loading -> authenticated transition, so a signed-out
 * visitor never pays for a refetch, and an already-authenticated client-side
 * navigation (whose first fetch already carried the token) doesn't double-fetch.
 */
export function useRefetchOnSignIn(refetch: () => unknown): void {
  const { status } = useAuth();
  // Seeded from the FIRST observed status: true only when we mounted mid-resolve
  // (a hard refresh), which is exactly when the initial fetch went out anonymous.
  const correctionPending = useRef(status === "loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && correctionPending.current) {
      void refetch();
    }
    // Once the session has resolved either way, no further correction is owed.
    correctionPending.current = false;
  }, [status, refetch]);
}
