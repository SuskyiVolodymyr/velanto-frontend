"use client";

import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { canActOn } from "@/src/shared/lib/staff-permissions";
import {
  useUsersAdmin,
  isCurrentlyBanned,
} from "@/src/features/admin/use-users-admin";
import { UserRow } from "@/src/features/admin/UserRow";

export function UsersTab() {
  const { user } = useAuth();
  const {
    searchInput,
    setSearchInput,
    users,
    total,
    status,
    loadingMore,
    banTargetId,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    actionError,
    handleLoadMore,
    handleBan,
    handleUnban,
    handleSetTrusted,
    toggleBanForm,
  } = useUsersAdmin();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search users by username or email"
          placeholder="Search by username or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading users…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load users. Try again later.
        </Text>
      )}
      {status === "ready" && users.length === 0 && (
        <Text variant="secondary">No users match this search.</Text>
      )}

      {status === "ready" && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((row) => (
            <UserRow
              key={row.id}
              row={row}
              canAct={canActOn(user.role, row.role)}
              banned={isCurrentlyBanned(row.bannedUntil)}
              banFormOpen={banTargetId === row.id}
              banDuration={banDuration}
              banReason={banReason}
              onSetTrusted={handleSetTrusted}
              onUnban={handleUnban}
              onToggleBanForm={toggleBanForm}
              onBanDurationChange={setBanDuration}
              onBanReasonChange={setBanReason}
              onConfirmBan={handleBan}
            />
          ))}
        </div>
      )}

      {actionError && (
        <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>
      )}

      {status === "ready" && users.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
