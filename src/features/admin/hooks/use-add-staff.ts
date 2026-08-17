import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersClient } from "@/api/users-client";
import { adminClient } from "@/api/admin-client";
import type { AssignableRole } from "@/utils/staff-permissions";
import type { AdminUserRow } from "@/types/admin";

export type AddStaffInputKind = "email" | "username" | "id";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// AdminUserRow.id is the backend's User.id, which Prisma generates via
// `@id @default(uuid())` (velanto-backend/prisma/schema.prisma) — a canonical
// 8-4-4-4-12 hex UUID. That's a real, hyphenated shape, not the bare
// `[0-9a-f]{6,}` heuristic the mock ports — a plain hex-run regex would both
// misfire on ordinary hex-looking usernames and never match an actual id
// (which always carries hyphens), so this checks the real format instead.
const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function detectAddStaffKind(raw: string): AddStaffInputKind {
  const value = raw.trim();
  if (EMAIL_RE.test(value)) return "email";
  if (USER_ID_RE.test(value)) return "id";
  return "username";
}

type ResolvedStaff = { id: string } | { candidates: AdminUserRow[] };

/**
 * The "+ Add staff" bar's whole state machine: what was typed, which role to
 * grant, the candidate picker when the input is ambiguous, and the two
 * mutations behind it.
 */
export function useAddStaff() {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [role, setRole] = useState<AssignableRole>("moderator");
  const [matches, setMatches] = useState<AdminUserRow[] | null>(null);
  // "+ Add staff" grants a role once a user id is known; that id is resolved
  // separately below (email / username / id), so this mutation stays a plain
  // grant.
  const grant = useMutation({
    mutationFn: ({ id, role: next }: { id: string; role: AssignableRole }) =>
      usersClient.changeRole(id, next),
    onSuccess: () => {
      setInput("");
      setMatches(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
  });

  /**
   * Resolves whatever was typed into a user id, three ways depending on shape:
   *  - email → `listUsers({q})` + an EXACT email match. `q` is a substring
   *    search, so trusting its top hit could promote a different account.
   *  - id → `adminClient.userDetail(id)` directly — already an exact,
   *    unambiguous lookup, so no disambiguation is needed.
   *  - username (bare word or "@handle") → `listUsers({q})`; only an EXACT
   *    (case-insensitive) username match among the results resolves straight
   *    through — anything else, including a lone substring-only hit, surfaces
   *    as candidates for the caller to disambiguate via a picker (never trust
   *    the top, or only, hit of a substring search for a privilege grant).
   */
  const resolve = useMutation({
    mutationFn: async (raw: string): Promise<ResolvedStaff> => {
      const value = raw.trim();
      const kind = detectAddStaffKind(value);

      if (kind === "email") {
        const found = await adminClient.listUsers({ q: value, limit: 50 });
        const match = found.items.find(
          (row) => row.email.toLowerCase() === value.toLowerCase(),
        );
        if (!match) throw new Error(t("noUserEmailError"));
        return { id: match.id };
      }

      if (kind === "id") {
        try {
          const found = await adminClient.userDetail(value);
          return { id: found.id };
        } catch {
          throw new Error(t("addStaffNoMatchOther"));
        }
      }

      const query = value.startsWith("@") ? value.slice(1) : value;
      const found = await adminClient.listUsers({ q: query, limit: 50 });
      if (found.items.length === 0) throw new Error(t("addStaffNoMatchOther"));
      // `q` is a substring search, so a single hit is not necessarily an
      // exact match (e.g. "alic" substring-matching only "alice") — the
      // email path above already requires exactness before auto-resolving,
      // and a privilege grant deserves the same bar. Only an exact,
      // case-insensitive username match resolves directly; anything else
      // (including a lone substring hit) goes through the disambiguation
      // dropdown so a human confirms the actual account before it's staffed.
      const exactMatch = found.items.find(
        (row) => row.username.toLowerCase() === query.toLowerCase(),
      );
      if (exactMatch) return { id: exactMatch.id };
      return { candidates: found.items };
    },
    onSuccess: (result) => {
      if ("candidates" in result) {
        setMatches(result.candidates);
        return;
      }
      setMatches(null);
      grant.mutate({ id: result.id, role });
    },
  });

  const errorMessage = resolve.isError
    ? resolve.error.message
    : grant.isError
      ? t("changeRoleError")
      : "";

  return {
    input,
    setInput,
    role,
    setRole,
    matches,
    setMatches,
    /** Kind badge shown beside the input; null while the input is empty. */
    kind: input.trim() ? detectAddStaffKind(input) : null,
    isPending: resolve.isPending || grant.isPending,
    submit: () => resolve.mutate(input),
    grantTo: (id: string) => grant.mutate({ id, role }),
    errorMessage,
  };
}

export type AddStaffState = ReturnType<typeof useAddStaff>;
