"use client";

import { createContext, useContext } from "react";

/**
 * Lets a pool's open item panel tell the form that it is holding an image the
 * pack-level Save cannot reach.
 *
 * An item only enters the pack when its own Add/Save is pressed; the form
 * serialises committed items and nothing else. So an uploaded picture sitting
 * in an open panel is invisible to Save — the author presses it, the pack saves
 * successfully, and the image is simply not in it. That is how
 * velanto-frontend#437 cost an author 162 uploads over an evening: they saved
 * repeatedly *to protect the work*, which could never have helped.
 *
 * The registry is a callback rather than a shared value so a pool only ever
 * writes to it and never reads it back. What the form stores behind it is the
 * form's own business — see `pendingImagePools` in CreatePackForm, which has to
 * be state rather than a ref because `onValid` is reachable from the
 * `handleSubmit(...)` call made during render.
 */
export interface PendingImageDrafts {
  /** Report whether pool `index` holds an uploaded-but-uncommitted image. */
  report: (index: number, pending: boolean) => void;
}

const PendingImageDraftsContext = createContext<PendingImageDrafts | null>(
  null,
);

export const PendingImageDraftsProvider = PendingImageDraftsContext.Provider;

/**
 * Null outside the form — GroupEditor is rendered directly by several tests and
 * by nothing else in the app, and a pool with nowhere to report to is fine.
 */
export function usePendingImageDrafts(): PendingImageDrafts | null {
  return useContext(PendingImageDraftsContext);
}
