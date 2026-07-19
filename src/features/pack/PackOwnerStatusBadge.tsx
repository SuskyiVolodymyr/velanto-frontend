"use client";

import { useAuth } from "@/src/shared/lib/auth-context";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import type { PackStatus } from "@/src/shared/types/pack";

/**
 * Surfaces a pack's moderation status to its author while the pack isn't public
 * yet — draft, pending, or rejected. An approved pack shows nothing (its public
 * state needs no badge), and everyone who isn't the author — including
 * signed-out visitors — sees nothing at all. Purely a UX cue; who may see a
 * non-approved pack is enforced server-side.
 */
export function PackOwnerStatusBadge({
  packAuthorId,
  status,
}: {
  packAuthorId: string;
  status: PackStatus;
}) {
  const { user } = useAuth();
  if (!user || user.id !== packAuthorId || status === "approved") return null;
  return <StatusBadge kind="pack" status={status} />;
}
