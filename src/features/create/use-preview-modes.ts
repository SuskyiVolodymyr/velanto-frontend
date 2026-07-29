"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import type { AvailableMode } from "@/src/features/friends-rooms/room-types";
import type { Group, PackFormat, Round } from "@/src/shared/types/pack";

export interface PreviewModesDraft {
  format: PackFormat;
  groups: Group[];
  rounds: Round[];
}

// Longer than PeopleFeed's 300ms search debounce (SEARCH_DEBOUNCE_MS) — this
// request carries the whole pools+rounds shape and runs a real draw
// simulation server-side (see PreviewModesDto's own comment), so it's worth
// waiting a beat longer for typing/dragging to settle before firing it.
const PREVIEW_DEBOUNCE_MS = 400;

/**
 * The Create/Edit Pack form's live "Friend modes unlocked" preview. `draft`
 * is the form's CURRENT (every-keystroke) values; this debounces content
 * changes — not object identity, which `useWatch` churns on every field,
 * including ones this panel doesn't care about (title, description, ...) —
 * before firing POST /packs/modes/preview. `keepPreviousData` (mirrors
 * useUserSearch's own choice) keeps the last known feasibility on screen
 * while a new one loads, instead of flashing empty on every debounce tick.
 */
export function usePreviewModes(
  draft: PreviewModesDraft,
  options: { debounceMs?: number } = {},
) {
  const debounceMs = options.debounceMs ?? PREVIEW_DEBOUNCE_MS;
  const draftKey = JSON.stringify(draft);
  const [debouncedDraft, setDebouncedDraft] = useState(draft);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedDraft(draft), debounceMs);
    return () => clearTimeout(timeout);
    // draftKey is the real dependency (content, not identity) — draft itself
    // is a fresh object every render even when its content hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, debounceMs]);

  const query = useQuery({
    queryKey: ["preview-modes", JSON.stringify(debouncedDraft)],
    queryFn: ({ signal }) =>
      friendsRoomsClient.previewModes(debouncedDraft, { signal }),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  return {
    modes: (query.data ?? null) as AvailableMode[] | null,
    isPending: draftKey !== JSON.stringify(debouncedDraft) || query.isFetching,
  };
}
