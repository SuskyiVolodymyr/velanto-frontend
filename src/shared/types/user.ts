/**
 * Local, independent type definition. This repo does NOT import types from
 * velanto-backend (separate repos, separate type definitions, per project
 * decision — see .claude/docs/coding-conventions.md). Field shape mirrors
 * what the backend currently exposes over its API, but is redeclared here
 * on purpose so the two repos can evolve independently.
 */
export type Role = "user" | "moderator" | "admin" | "manager";

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
}
