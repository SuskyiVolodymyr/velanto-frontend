import { apiClient } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

export interface AuthResult {
  accessToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export const authClient = {
  register: (input: RegisterInput) => apiClient.post<AuthResult>("/auth/register", input),
  login: (input: LoginInput) => apiClient.post<AuthResult>("/auth/login", input),
  refresh: () => apiClient.post<AuthResult>("/auth/refresh"),
  logout: () => apiClient.post<{ success: true }>("/auth/logout"),
};
