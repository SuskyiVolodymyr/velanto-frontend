"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Button } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAuth } from "@/src/shared/lib/auth-context";
import { canActOn } from "@/src/shared/lib/staff-permissions";
import type { AdminUserSort } from "@/src/shared/lib/admin-client";
import {
  useUsersAdmin,
  isCurrentlyBanned,
  type BannedFilter,
} from "@/src/features/admin/use-users-admin";
import { UserRow } from "@/src/features/admin/UserRow";
import { DataTable } from "@/src/shared/components/DataTable";

const COLUMNS = "1.3fr 80px 80px 100px 110px 130px";

export function UsersTab() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const {
    searchInput,
    setSearchInput,
    sort,
    setSort,
    bannedFilter,
    setBannedFilter,
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
    banPending,
    trustPendingId,
    unbanPendingId,
    handleLoadMore,
    handleBan,
    handleUnban,
    handleSetTrusted,
    toggleBanForm,
  } = useUsersAdmin();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Input/Select hardcode w-full (cn() is a plain joiner), so the sizing
          lives on wrapper divs or the controls would each stack full-width. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            type="search"
            aria-label={t("searchUsersAria")}
            placeholder={t("searchUsersPlaceholder")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="w-[150px]">
          <Select
            aria-label={t("filterBanAria")}
            value={bannedFilter}
            onChange={(event) =>
              setBannedFilter(event.target.value as BannedFilter)
            }
            options={[
              { value: "all", label: t("banAll") },
              { value: "banned", label: t("banBanned") },
              { value: "active", label: t("banActive") },
            ]}
          />
        </div>
        <div className="w-[160px]">
          <Select
            aria-label={t("sortRegAria")}
            value={sort}
            onChange={(event) => setSort(event.target.value as AdminUserSort)}
            options={[
              { value: "newest", label: t("sortNewest") },
              { value: "oldest", label: t("sortOldest") },
            ]}
          />
        </div>
      </div>

      {status === "loading" && (
        <LoadingState label={t("loadingUsers")} showLabel />
      )}
      {status === "error" && <Text variant="danger">{t("usersError")}</Text>}

      {status === "ready" && (
        <DataTable
          columns={COLUMNS}
          headers={[
            t("hUser"),
            t("hPacks"),
            t("hPlays"),
            t("hRegistered"),
            t("hStatus"),
            "",
          ]}
          empty={t("noUsers")}
          isEmpty={users.length === 0}
        >
          {users.map((row) => (
            <UserRow
              key={row.id}
              row={row}
              columns={COLUMNS}
              canAct={canActOn(user.role, row.role)}
              banned={isCurrentlyBanned(row.bannedUntil)}
              banFormOpen={banTargetId === row.id}
              banDuration={banDuration}
              banReason={banReason}
              trustPending={trustPendingId === row.id}
              unbanPending={unbanPendingId === row.id}
              banPending={banPending && banTargetId === row.id}
              onSetTrusted={handleSetTrusted}
              onUnban={handleUnban}
              onToggleBanForm={toggleBanForm}
              onBanDurationChange={setBanDuration}
              onBanReasonChange={setBanReason}
              onConfirmBan={handleBan}
            />
          ))}
        </DataTable>
      )}

      {actionError && (
        <Text variant="danger" className="text-sm">
          {actionError}
        </Text>
      )}

      {status === "ready" && users.length < total && (
        <Button
          variant="secondary"
          loading={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? tCommon("loading") : tCommon("loadMore")}
        </Button>
      )}
    </div>
  );
}
