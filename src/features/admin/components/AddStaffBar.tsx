"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Dropdown } from "@/ui/Dropdown";
import { UserAvatar } from "@/components/UserAvatar";
import type { AssignableRole } from "@/utils/staff-permissions";
import type { AddStaffState } from "@/features/admin/hooks/use-add-staff";

const KIND_BADGE_CLASS =
  "w-fit shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary";

export interface AddStaffBarProps {
  add: AddStaffState;
  addableRoles: AssignableRole[];
}

/**
 * Grant bar: type an email, username or user id, pick a role, add. An ambiguous
 * input opens a candidate listbox instead of guessing — see useAddStaff for why
 * a substring hit never auto-resolves a privilege grant.
 */
export function AddStaffBar({ add, addableRoles }: AddStaffBarProps) {
  const t = useTranslations("admin");
  // DOM refs stay in the component, not in useAddStaff's returned bundle:
  // react-hooks/refs flags every property read on an object that carries a ref.
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { matches, setMatches } = add;

  // Same dismiss-on-outside-click / dismiss-on-Escape convention as
  // Popover.tsx/UserMenu.tsx elsewhere in this app: close the matches dropdown
  // on an outside mousedown, or on Escape (which also returns focus to the
  // button that opened it).
  useEffect(() => {
    if (!matches) return;

    function handlePointerDown(event: MouseEvent) {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setMatches(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMatches(null);
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [matches, setMatches]);

  const kindLabel =
    add.kind === "email"
      ? t("addStaffKindEmail")
      : add.kind === "id"
        ? t("addStaffKindUserId")
        : add.kind === "username"
          ? t("addStaffKindUsername")
          : null;

  return (
    <div
      ref={barRef}
      className="relative flex flex-wrap items-center gap-2.5 rounded-[14px] border border-border bg-white/[0.02] px-[18px] py-4"
    >
      <Input
        type="text"
        aria-label={t("addStaffInputAria")}
        placeholder={t("addStaffInputPlaceholder")}
        value={add.input}
        onChange={(event) => {
          add.setInput(event.target.value);
          setMatches(null);
        }}
        className="min-w-[180px] flex-1"
      />
      {kindLabel && <span className={KIND_BADGE_CLASS}>{kindLabel}</span>}
      <Dropdown
        ariaLabel={t("roleToGrantAria")}
        value={add.role}
        onChange={(role) => add.setRole(role as AssignableRole)}
        options={addableRoles.map((role) => ({ value: role, label: role }))}
        surface="card"
        className="w-auto"
      />
      <Button
        ref={buttonRef}
        loading={add.isPending}
        disabled={!add.input.trim()}
        onClick={add.submit}
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
                  add.grantTo(row.id);
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
  );
}
