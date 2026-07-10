/**
 * Local, independent type definition. This repo does NOT import types from
 * velanto-backend (separate repos, separate type definitions, per project
 * decision — see .claude/docs/coding-conventions.md). Field shape mirrors
 * what the backend currently exposes over its API, but is redeclared here
 * on purpose so the two repos can evolve independently.
 */
import type { BanReason } from "@/src/shared/types/rules";

export const ROLES = ["user", "moderator", "admin", "manager"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
  /**
   * Ban surface for the *current* user, from the `/me`-style payload. Present
   * (as `null` when not banned) on the live backend; kept optional here so the
   * many existing `User` fixtures that predate this field stay valid without a
   * mass edit. `banReason` is a category id or `'other'`; `banReasonDetail` is
   * the moderator's free-text context. These are the user's own moderation
   * data — safe to show them, and nothing beyond it is exposed.
   */
  bannedUntil?: string | null;
  banReason?: BanReason | null;
  banReasonDetail?: string | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  bio: string | null;
  createdAt: string;
  followerCount: number;
  isFollowedByMe: boolean | null;
}
