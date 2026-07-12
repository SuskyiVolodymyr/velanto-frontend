"use client";

import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { Hidden } from "@/src/shared/components/Hidden";
import { formatBanStatus } from "@/src/shared/lib/ban-display";
import { type BanDuration } from "@/src/shared/lib/users-client";
import { type BanReasonState } from "@/src/shared/components/BanReasonPicker";
import type { AdminUserRow } from "@/src/shared/types/admin";
import { UserBanForm } from "@/src/features/admin/UserBanForm";

interface UserRowProps {
  row: AdminUserRow;
  canAct: boolean;
  banned: boolean;
  banFormOpen: boolean;
  banDuration: BanDuration;
  banReason: BanReasonState;
  trustPending: boolean;
  unbanPending: boolean;
  banPending: boolean;
  onSetTrusted: (id: string, trusted: boolean) => void;
  onUnban: (id: string) => void;
  onToggleBanForm: (id: string) => void;
  onBanDurationChange: (duration: BanDuration) => void;
  onBanReasonChange: (reason: BanReasonState) => void;
  onConfirmBan: (id: string) => void;
}

/** One admin user row: identity (streamer-masked), role/ban status, and the
 * moderator's trust/ban controls plus the inline ban form when open. */
export function UserRow({
  row,
  canAct,
  banned,
  banFormOpen,
  banDuration,
  banReason,
  trustPending,
  unbanPending,
  banPending,
  onSetTrusted,
  onUnban,
  onToggleBanForm,
  onBanDurationChange,
  onBanReasonChange,
  onConfirmBan,
}: UserRowProps) {
  return (
    <div className="rounded-[15px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text className="font-semibold">
            <Hidden kind="name" id={row.id}>
              <Username
                username={row.username}
                role={row.role}
                trusted={row.trusted}
              />
            </Hidden>
          </Text>
          <Text variant="tertiary" className="text-xs">
            <Hidden kind="name" id={row.id}>
              {row.email}
            </Hidden>{" "}
            · <Badge>{row.role}</Badge>
          </Text>
          <Text variant="secondary" className="text-xs">
            {formatBanStatus(row.bannedUntil)}
          </Text>
        </div>
        {canAct && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={trustPending}
              onClick={() => void onSetTrusted(row.id, !row.trusted)}
            >
              {row.trusted ? "Untrust" : "Trust"}
            </Button>
            {banned ? (
              <Button
                variant="secondary"
                loading={unbanPending}
                onClick={() => void onUnban(row.id)}
              >
                Unban
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => onToggleBanForm(row.id)}
              >
                Ban
              </Button>
            )}
          </div>
        )}
      </div>
      {banFormOpen && (
        <UserBanForm
          userId={row.id}
          banDuration={banDuration}
          banReason={banReason}
          loading={banPending}
          onDurationChange={onBanDurationChange}
          onReasonChange={onBanReasonChange}
          onConfirm={() => void onConfirmBan(row.id)}
        />
      )}
    </div>
  );
}
