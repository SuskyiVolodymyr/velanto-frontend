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
  /**
   * Storage key of the signed-in user's avatar (null/absent = initials
   * placeholder). Optional because the auth endpoints (`/auth/refresh` etc.)
   * that seed this user don't currently include it — the header falls back to
   * the initial until it's known, and {@link AuthProvider}'s `setAvatarKey`
   * patches it live when the user changes their own avatar.
   */
  avatarKey?: string | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  bio: string | null;
  createdAt: string;
  followerCount: number;
  isFollowedByMe: boolean | null;
  /**
   * Role + trust flags for the animated-nickname / verified-badge treatment.
   * Optional so the many pre-existing profile fixtures stay valid without a
   * mass edit (same rationale as `User`'s ban fields); the live backend always
   * sends them on the public profile.
   */
  role?: Role;
  trusted?: boolean;
  /**
   * Storage key of the user's avatar, or null for the initials placeholder.
   * Resolved to a render URL via `mediaUrl`. Optional so the many pre-existing
   * profile fixtures stay valid without a mass edit (same rationale as `role`/
   * `trusted`); the live backend always sends it on the public profile.
   */
  avatarKey?: string | null;
  /**
   * Whether this user exposes their "recently played" list publicly. Optional
   * so existing profile fixtures stay valid (same rationale as `role`/`trusted`);
   * the live backend always sends it. The profile uses it to decide whether to
   * render the recently-played section.
   */
  showPlayHistory?: boolean;
}

/**
 * The caller's own profile (GET /users/me) — a superset of the public profile.
 * Only the fields the client actually consumes are typed; the backend also
 * returns ban-state and rules-acceptance fields not modeled here yet.
 */
export interface MyProfile {
  id: string;
  username: string;
  email: string;
  showPlayHistory: boolean;
}
