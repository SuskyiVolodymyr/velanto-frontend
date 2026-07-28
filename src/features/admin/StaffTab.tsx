"use client";
import { formatDate } from "@/src/shared/lib/format-date";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Select } from "@/src/shared/components/Select";
import { Hidden } from "@/src/shared/components/Hidden";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { useAdminStaff } from "@/src/features/admin/api/admin.queries";
import { DataTable, DataTableRow } from "@/src/shared/components/DataTable";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/src/shared/lib/staff-permissions";
import type { AdminUserRow } from "@/src/shared/types/admin";

const SEARCH_DEBOUNCE_MS = 300;
const COLUMNS = "1.3fr 130px 1fr 110px 90px";

function formatSince(since: string | null): string {
  if (!since) return "—";
  return formatDate(since);
}

/**
 * Members promoted before provenance was recorded (seeded, or promoted straight
 * in the DB) have no promoter — nobody in the User table put them there. They
 * read as "System" rather than a blank cell or a fabricated name. Their `since`
 * was backfilled to their account-creation date.
 */
function formatAddedBy(addedBy: string | null, systemLabel: string): string {
  return addedBy ?? systemLabel;
}

type AddStaffInputKind = "email" | "username" | "id";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// AdminUserRow.id is the backend's User.id, which Prisma generates via
// `@id @default(uuid())` (velanto-backend/prisma/schema.prisma) — a canonical
// 8-4-4-4-12 hex UUID. That's a real, hyphenated shape, not the bare
// `[0-9a-f]{6,}` heuristic the mock ports — a plain hex-run regex would both
// misfire on ordinary hex-looking usernames and never match an actual id
// (which always carries hyphens), so this checks the real format instead.
const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectAddStaffKind(raw: string): AddStaffInputKind {
  const value = raw.trim();
  if (EMAIL_RE.test(value)) return "email";
  if (USER_ID_RE.test(value)) return "id";
  return "username";
}

type ResolvedStaff = { id: string } | { candidates: AdminUserRow[] };

export function StaffTab() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  // Streamer mode masks identity visually; also keep it out of the role-select
  // aria-label so a screen reader on a shared screen doesn't announce the name.
  const { enabled: streamerMode } = useStreamerModeOrDefault();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [addInput, setAddInput] = useState("");
  const [addRole, setAddRole] = useState<AssignableRole>("moderator");
  const [matches, setMatches] = useState<AdminUserRow[] | null>(null);
  const addBarRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Same dismiss-on-outside-click / dismiss-on-Escape convention as
  // Popover.tsx/UserMenu.tsx elsewhere in this app: close the matches
  // dropdown on an outside mousedown, or on Escape (which also returns focus
  // to the button that opened it).
  useEffect(() => {
    if (!matches) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        addBarRef.current &&
        !addBarRef.current.contains(event.target as Node)
      ) {
        setMatches(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMatches(null);
      addButtonRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [matches]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const staffQuery = useAdminStaff(query);

  const staff = useMemo(() => {
    const seen = new Set<string>();
    const out: AdminUserRow[] = [];
    for (const page of staffQuery.data?.pages ?? []) {
      for (const row of page.items) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          out.push(row);
        }
      }
    }
    return out;
  }, [staffQuery.data]);

  const total = staffQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = staffQuery.data !== undefined;
  const status = staffQuery.isLoading
    ? "loading"
    : !hasData && staffQuery.isError
      ? "error"
      : "ready";

  // A role change can add someone to, or drop them from, this staff-ONLY list,
  // so refetch rather than patching a row that may no longer belong in it.
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignableRole }) =>
      usersClient.changeRole(id, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  // "+ Add staff" grants a role once a user id is known; that id is resolved
  // separately below (email / username / id), so this mutation stays a plain
  // grant.
  const addStaff = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignableRole }) =>
      usersClient.changeRole(id, role),
    onSuccess: () => {
      setAddInput("");
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
   *  - username (bare word or "@handle") → `listUsers({q})`; a single hit
   *    resolves straight through, more than one hit surfaces as candidates
   *    for the caller to disambiguate via a picker (never trust the top hit
   *    of a substring search).
   */
  const resolveStaff = useMutation({
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
      addStaff.mutate({ id: result.id, role: addRole });
    },
  });

  const actionError = changeRole.isError
    ? t("changeRoleError")
    : resolveStaff.isError
      ? resolveStaff.error.message
      : addStaff.isError
        ? t("changeRoleError")
        : staffQuery.isFetchNextPageError
          ? t("loadMoreStaffError")
          : "";

  if (!user) return null;

  // 'user' is the demote-to-nobody role — the Remove button owns it, so it
  // never belongs in the add-staff or per-row role dropdowns.
  const addableRoles = assignableRolesFor(user.role, "user").filter(
    (role) => role !== "user",
  );

  const addKind = addInput.trim() ? detectAddStaffKind(addInput) : null;
  const addKindLabel =
    addKind === "email"
      ? t("addStaffKindEmail")
      : addKind === "id"
        ? t("addStaffKindUserId")
        : addKind === "username"
          ? t("addStaffKindUsername")
          : null;

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={addBarRef}
        className="relative flex flex-wrap items-center gap-2.5 rounded-[14px] border border-border bg-white/[0.02] px-[18px] py-4"
      >
        <Input
          type="text"
          aria-label={t("addStaffInputAria")}
          placeholder={t("addStaffInputPlaceholder")}
          value={addInput}
          onChange={(event) => {
            setAddInput(event.target.value);
            setMatches(null);
          }}
          className="min-w-[180px] flex-1"
        />
        {addKindLabel && (
          <span className="w-fit shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary">
            {addKindLabel}
          </span>
        )}
        <Select
          aria-label={t("roleToGrantAria")}
          value={addRole}
          onChange={(event) => setAddRole(event.target.value as AssignableRole)}
          options={addableRoles.map((role) => ({ value: role, label: role }))}
          className="h-10 w-auto"
        />
        <Button
          ref={addButtonRef}
          loading={resolveStaff.isPending || addStaff.isPending}
          disabled={!addInput.trim()}
          onClick={() => resolveStaff.mutate(addInput)}
        >
          {t("addStaff")}
        </Button>

        {matches && (
          <ul
            role="listbox"
            aria-label={t("addStaffMatchesAria")}
            className="absolute start-0 top-[calc(100%+8px)] z-30 max-h-64 w-full min-w-[260px] overflow-y-auto rounded-xl border border-border bg-surface-raised p-1.5 shadow-lg"
          >
            {matches.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setMatches(null);
                    addStaff.mutate({ id: row.id, role: addRole });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <UserAvatar
                    username={row.username}
                    size="sm"
                    className="border border-border bg-surface text-foreground-secondary"
                  />
                  <span className="min-w-0 flex-1">
                    <Text className="truncate text-[13px] font-semibold">
                      {row.username}
                    </Text>
                    <Text variant="tertiary" className="truncate text-[11.5px]">
                      {row.email}
                    </Text>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-sm">
        <Input
          type="search"
          aria-label={t("searchStaffAria")}
          placeholder={t("searchStaffPlaceholder")}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && (
        <LoadingState label={t("loadingStaff")} showLabel />
      )}
      {status === "error" && <Text variant="danger">{t("staffError")}</Text>}

      {status === "ready" && (
        <DataTable
          columns={COLUMNS}
          headers={[t("hMember"), t("hRole"), t("hAddedBy"), t("hSince"), ""]}
          empty={t("noStaff")}
          isEmpty={staff.length === 0}
        >
          {staff.map((row) => {
            const grantable = assignableRolesFor(user.role, row.role);
            const options = grantable.filter(
              (role) => role !== row.role && role !== "user",
            );
            const canRemove = grantable.includes("user");
            return (
              <DataTableRow key={row.id} columns={COLUMNS}>
                <div className="min-w-0">
                  <Text className="truncate text-[13.5px] font-semibold">
                    <Hidden kind="name" id={row.id}>
                      <Username
                        username={row.username}
                        role={row.role}
                        trusted={row.trusted}
                      />
                    </Hidden>
                  </Text>
                  <Text variant="tertiary" className="truncate text-xs">
                    <Hidden kind="name" id={row.id}>
                      {row.email}
                    </Hidden>
                  </Text>
                </div>

                {options.length > 0 ? (
                  <select
                    value={row.role}
                    onChange={(event) =>
                      changeRole.mutate({
                        id: row.id,
                        role: event.target.value as AssignableRole,
                      })
                    }
                    aria-label={
                      streamerMode
                        ? t("changeRoleGenericAria")
                        : t("changeRoleNamedAria", { username: row.username })
                    }
                    className="h-8 w-fit rounded-lg border border-border bg-white/[0.05] px-2 text-[12.5px] text-foreground"
                  >
                    {/* Their current role must be present as the selected option,
                        or the control would render blank whenever they hold a
                        role this actor may not grant. */}
                    <option value={row.role} disabled>
                      {row.role}
                    </option>
                    {options.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="w-fit rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary">
                    {row.role}
                  </span>
                )}

                <Text variant="secondary" className="truncate text-[13px]">
                  {formatAddedBy(row.staffAddedBy, t("system"))}
                </Text>
                <Text variant="tertiary" className="text-[12.5px]">
                  {formatSince(row.staffSince)}
                </Text>

                {canRemove ? (
                  <button
                    type="button"
                    onClick={() =>
                      changeRole.mutate({ id: row.id, role: "user" })
                    }
                    className="w-fit rounded-md bg-danger/10 px-2.5 py-1.5 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/20"
                  >
                    {t("remove")}
                  </button>
                ) : (
                  <span />
                )}
              </DataTableRow>
            );
          })}
        </DataTable>
      )}

      {actionError && (
        <Text variant="danger" className="text-sm" role="alert">
          {actionError}
        </Text>
      )}

      {status === "ready" && staff.length < total && (
        <Button
          variant="secondary"
          loading={staffQuery.isFetchingNextPage}
          onClick={() => void staffQuery.fetchNextPage()}
        >
          {staffQuery.isFetchingNextPage
            ? tCommon("loading")
            : tCommon("loadMore")}
        </Button>
      )}
    </div>
  );
}
