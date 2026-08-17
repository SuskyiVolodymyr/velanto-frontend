"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { Dropdown } from "@/ui/Dropdown";
import { DataTable, DataTableRow } from "@/ui/DataTable";
import { Username } from "@/components/Username";
import { Hidden } from "@/components/Hidden";
import { formatDate } from "@/utils/format-date";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/utils/staff-permissions";
import type { AdminUserRow } from "@/types/admin";
import type { Role } from "@/types/user";

const COLUMNS = "1.3fr 130px 1fr 110px 90px";

const ROLE_BADGE_CLASS =
  "w-fit rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary";

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

export interface StaffTableProps {
  staff: AdminUserRow[];
  /** The acting admin's role — decides which roles each row may be moved to. */
  actorRole: Role;
  /** Keeps the row's name out of the role-select aria-label on a shared screen. */
  streamerMode: boolean;
  onChangeRole: (id: string, role: AssignableRole) => void;
}

export function StaffTable({
  staff,
  actorRole,
  streamerMode,
  onChangeRole,
}: StaffTableProps) {
  const t = useTranslations("admin");

  return (
    <DataTable
      columns={COLUMNS}
      headers={[t("hMember"), t("hRole"), t("hAddedBy"), t("hSince"), ""]}
      empty={t("noStaff")}
      isEmpty={staff.length === 0}
    >
      {staff.map((row) => {
        const grantable = assignableRolesFor(actorRole, row.role);
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
              <Dropdown
                value={row.role}
                onChange={(role) =>
                  onChangeRole(row.id, role as AssignableRole)
                }
                ariaLabel={
                  streamerMode
                    ? t("changeRoleGenericAria")
                    : t("changeRoleNamedAria", { username: row.username })
                }
                size="sm"
                surface="card"
                className="w-fit"
                options={[
                  // Their current role must be present as the selected option,
                  // or the control would render blank whenever they hold a role
                  // this actor may not grant.
                  { value: row.role, label: row.role, disabled: true },
                  ...options.map((role) => ({ value: role, label: role })),
                ]}
              />
            ) : (
              <span className={ROLE_BADGE_CLASS}>{row.role}</span>
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
                onClick={() => onChangeRole(row.id, "user")}
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
  );
}
