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

export const usersClient = {
  ban: (id: string, input: BanUserInput) => apiClient.post<BanResult>(`/users/${id}/ban`, input),
  unban: (id: string) => apiClient.post<UnbanResult>(`/users/${id}/unban`),
  changeRole: (id: string, role: AssignableRole) =>
    apiClient.patch<ChangeRoleResult>(`/users/${id}/role`, { role }),
  getProfile: (id: string) => apiClient.get<PublicUserProfile>(`/users/${id}`),
  updateProfile: (bio: string) =>
    apiClient.patch<{ id: string; bio: string }>("/users/me", { bio }),
};
