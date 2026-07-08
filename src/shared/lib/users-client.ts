import { apiClient } from "@/src/shared/lib/api-client";
import type { AssignableRole } from "@/src/shared/lib/staff-permissions";
import type { PublicUserProfile } from "@/src/shared/types/user";

export type BanDuration = "week" | "month" | "year" | "forever";

export interface BanUserInput {
  duration: BanDuration;
  reason: string;
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

export const usersClient = {
  ban: (id: string, input: BanUserInput) => apiClient.post<BanResult>(`/users/${id}/ban`, input),
  unban: (id: string) => apiClient.post<UnbanResult>(`/users/${id}/unban`),
  changeRole: (id: string, role: AssignableRole) =>
    apiClient.patch<ChangeRoleResult>(`/users/${id}/role`, { role }),
  getProfile: (id: string) => apiClient.get<PublicUserProfile>(`/users/${id}`),
  updateProfile: (bio: string) =>
    apiClient.patch<{ id: string; bio: string }>("/users/me", { bio }),
  follow: (id: string) => apiClient.post<{ followerCount: number }>(`/users/${id}/follow`),
  unfollow: (id: string) => apiClient.post<{ followerCount: number }>(`/users/${id}/unfollow`),
  banHistory: (id: string, params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiClient.get<BanHistoryPage>(`/users/${id}/ban-history${qs ? `?${qs}` : ""}`);
  },
};
