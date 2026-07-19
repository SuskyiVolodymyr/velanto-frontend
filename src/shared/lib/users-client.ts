import { apiClient } from "@/src/shared/lib/api-client";
import type { PackList } from "@/src/shared/lib/packs-client";
import type { AssignableRole } from "@/src/shared/lib/staff-permissions";
import type {
  MyProfile,
  PublicUserProfile,
  Role,
} from "@/src/shared/types/user";
import type { BanReason } from "@/src/shared/types/rules";

/** A compact user row in a followers / following list. */
export interface FollowUser {
  id: string;
  username: string;
  avatarKey: string | null;
  role: Role;
  trusted: boolean;
  // Whether the viewer follows THIS user. null = no viewer (anonymous) or the
  // row is the viewer themselves — no follow button in either case.
  isFollowedByMe: boolean | null;
}

export interface FollowUserPage {
  items: FollowUser[];
  total: number;
  page: number;
  limit: number;
}

export type BanDuration = "week" | "month" | "year" | "forever";

export interface BanUserInput {
  duration: BanDuration;
  /** A rule-category id or `'other'` — no longer free text (see rules.ts). */
  reason: BanReason;
  /** Required (non-empty, ≤500 chars) when `reason === 'other'`; optional otherwise. */
  reasonDetail?: string;
}

export interface BanResult {
  id: string;
  bannedUntil: string;
}

export interface UnbanResult {
  id: string;
  bannedUntil: null;
}

export interface ChangeRoleResult {
  id: string;
  role: AssignableRole;
}

export interface SetTrustedResult {
  id: string;
  trusted: boolean;
}

export interface BanHistoryEntry {
  actorUsername: string;
  meta: { duration: string; reason: string };
  createdAt: string;
}

export interface BanHistoryPage {
  items: BanHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

/** `?page=&limit=` for the follow lists, omitting either when unset. */
function followsQuery(params: { page?: number; limit?: number }): string {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const usersClient = {
  ban: (id: string, input: BanUserInput) =>
    apiClient.post<BanResult>(`/users/${id}/ban`, input),
  unban: (id: string) => apiClient.post<UnbanResult>(`/users/${id}/unban`),
  changeRole: (id: string, role: AssignableRole) =>
    apiClient.patch<ChangeRoleResult>(`/users/${id}/role`, { role }),
  setTrusted: (id: string, trusted: boolean) =>
    apiClient.patch<SetTrustedResult>(`/users/${id}/trusted`, { trusted }),
  getProfile: (id: string) => apiClient.get<PublicUserProfile>(`/users/${id}`),
  /** The caller's own profile (auth required). */
  getMe: () => apiClient.get<MyProfile>("/users/me"),
  updateProfile: (bio: string) =>
    apiClient.patch<{ id: string; bio: string }>("/users/me", { bio }),
  /** Change the caller's username (2-16 alphanumeric). 409 if already taken. */
  changeUsername: (username: string) =>
    apiClient.patch<{ id: string; username: string }>("/users/me/username", {
      username,
    }),
  /** Toggle the caller's play-history privacy preference. */
  updatePreferences: (showPlayHistory: boolean) =>
    apiClient.patch<{ showPlayHistory: boolean }>("/users/me/preferences", {
      showPlayHistory,
    }),
  /** Set the caller's avatar to an already-uploaded media key. */
  setAvatar: (key: string) =>
    apiClient.patch<{ id: string; avatarKey: string }>("/users/me/avatar", {
      key,
    }),
  /** Clear the caller's avatar back to the initials placeholder. */
  removeAvatar: () =>
    apiClient.delete<{ id: string; avatarKey: null }>("/users/me/avatar"),
  /** A user's public "recently played" packs (paginated, newest play first). */
  recentlyPlayed: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiClient.get<PackList>(
      `/users/${id}/recently-played${qs ? `?${qs}` : ""}`,
    );
  },
  follow: (id: string) =>
    apiClient.post<{ followerCount: number }>(`/users/${id}/follow`),
  unfollow: (id: string) =>
    apiClient.post<{ followerCount: number }>(`/users/${id}/unfollow`),
  /** Users who follow `id` (paginated, newest follow first). */
  followers: (id: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get<FollowUserPage>(
      `/users/${id}/followers${followsQuery(params)}`,
    ),
  /** Users `id` follows (paginated, newest follow first). */
  following: (id: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get<FollowUserPage>(
      `/users/${id}/following${followsQuery(params)}`,
    ),
  /**
   * Public username search — find people to follow by a case-insensitive
   * username substring. Same row shape as the follow lists (so `FollowUserRow`
   * renders results), with `isFollowedByMe` for a signed-in viewer.
   */
  search: (q: string, params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams({ q });
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    return apiClient.get<FollowUserPage>(`/users/search?${query.toString()}`);
  },
  banHistory: (id: string, params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiClient.get<BanHistoryPage>(
      `/users/${id}/ban-history${qs ? `?${qs}` : ""}`,
    );
  },
};
