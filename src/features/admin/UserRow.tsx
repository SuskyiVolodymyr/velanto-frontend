"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Hidden } from "@/src/shared/components/Hidden";
import { formatBanStatus } from "@/src/shared/lib/ban-display";
import { type BanDuration } from "@/src/shared/lib/users-client";
import { type BanReasonState } from "@/src/shared/components/BanReasonPicker";
import type { AdminUserRow } from "@/src/shared/types/admin";
import { UserBanForm } from "@/src/features/admin/UserBanForm";
import { DataTableRow } from "@/src/shared/components/DataTable";

interface UserRowProps {
  row: AdminUserRow;
  columns: string;
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

/**
 * One row of the admin Users table: identity (streamer-masked), the design's
 * PACKS / PLAYS / STATUS columns, and the moderator's trust/ban controls. The
 * ban form expands underneath the row rather than inside the action cell — the
 * API requires a duration AND a reason, which don't fit in a table cell.
 */
export function UserRow({
  row,
  columns,
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
  const t = useTranslations("admin");
  return (
    <>
      <DataTableRow columns={columns}>
        <div className="min-w-0">
          <Link
            href={`/admin/users/${row.id}`}
            className="truncate text-[13.5px] font-semibold text-foreground hover:text-acc"
          >
            <Hidden kind="name" id={row.id}>
              <Username
                username={row.username}
                role={row.role}
                trusted={row.trusted}
              />
            </Hidden>
          </Link>
          <Text variant="tertiary" className="truncate text-xs">
            <Hidden kind="name" id={row.id}>
              {row.email}
            </Hidden>
          </Text>
        </div>

        <Text variant="secondary" className="text-[13px] tabular-nums">
          {row.packs}
        </Text>
        <Text variant="secondary" className="text-[13px] tabular-nums">
          {row.plays}
        </Text>
        <Text variant="tertiary" className="text-[12.5px] tabular-nums">
          {new Date(row.createdAt).toLocaleDateString()}
        </Text>

        <span
          className={
            banned
              ? "w-fit rounded-md bg-danger/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-danger"
              : "w-fit rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary"
          }
        >
          {formatBanStatus(row.bannedUntil)}
        </span>

        {canAct ? (
          <div className="flex flex-wrap gap-1.5">
            <RowAction
              label={row.trusted ? t("untrust") : t("trust")}
              pending={trustPending}
              onClick={() => onSetTrusted(row.id, !row.trusted)}
            />
            {banned ? (
              <RowAction
                label={t("unban")}
                pending={unbanPending}
                onClick={() => onUnban(row.id)}
              />
            ) : (
              <RowAction
                label={t("ban")}
                danger
                pending={false}
                onClick={() => onToggleBanForm(row.id)}
              />
            )}
          </div>
        ) : (
          <span />
        )}
      </DataTableRow>

      {banFormOpen && (
        <div className="border-t border-white/[0.05] px-[18px] py-3">
          <UserBanForm
            userId={row.id}
            banDuration={banDuration}
            banReason={banReason}
            loading={banPending}
            onDurationChange={onBanDurationChange}
            onReasonChange={onBanReasonChange}
            onConfirm={() => onConfirmBan(row.id)}
          />
        </div>
      )}
    </>
  );
}

function RowAction({
  label,
  pending,
  danger,
  onClick,
}: {
  label: string;
  pending: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        danger
          ? "rounded-md bg-danger/10 px-2.5 py-1.5 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
          : "rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[12.5px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.1] hover:text-foreground disabled:opacity-50"
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
