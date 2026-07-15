import { apiClient } from "@/src/shared/lib/api-client";

/**
 * Personal Access Token scopes. Mirrors the backend PAT_SCOPES taxonomy
 * (velanto-backend src/modules/auth/pat/pat-scopes.ts) — a scope only ever
 * NARROWS what the token's owner can already do. Keep in sync with the backend;
 * an unknown scope is rejected there with a 400.
 */
export const PAT_SCOPES = [
  "packs:read",
  "packs:write",
  "packs:delete",
  "moderation",
  "profile:read",
] as const;

export type PatScope = (typeof PAT_SCOPES)[number];

/** Token metadata as returned by the API — never includes the secret. */
export interface ApiToken {
  id: string;
  name: string;
  scopes: PatScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** POST response: the metadata plus the plaintext secret, shown ONCE. */
export interface CreatedApiToken extends ApiToken {
  plaintext: string;
}

export interface CreateTokenInput {
  name: string;
  scopes: PatScope[];
  /** Days until expiry; null = never expires. Omit to accept the server default. */
  expiresInDays?: number | null;
}

export const tokensClient = {
  list: () => apiClient.get<ApiToken[]>("/auth/tokens"),
  create: (input: CreateTokenInput) =>
    apiClient.post<CreatedApiToken>("/auth/tokens", input),
  revoke: (id: string) =>
    apiClient.delete<{ revoked: true }>(`/auth/tokens/${id}`),
};
