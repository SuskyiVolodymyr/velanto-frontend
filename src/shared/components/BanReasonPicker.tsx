"use client";

import { useTranslations } from "next-intl";
import { useRules } from "@/src/shared/api/rules.queries";
import { Select, type SelectOption } from "@/src/shared/components/Select";
import { Textarea } from "@/src/shared/components/Textarea";
import { Text } from "@/src/shared/components/Text";
import type { BanReason } from "@/src/shared/types/rules";
import type { BanUserInput } from "@/src/shared/lib/users-client";

/** Max length of the free-text ban detail — mirrors the backend's cap. */
export const REASON_DETAIL_MAX = 500;

/**
 * Picker state. `reason` is `""` until the moderator picks one (the disabled
 * placeholder), otherwise a category id or `'other'`. `reasonDetail` is the
 * optional free-text context (required only for `'other'`).
 */
export interface BanReasonState {
  reason: BanReason | "";
  reasonDetail: string;
}

/** True once the picker holds a submittable reason (+ detail rules satisfied). */
export function isBanReasonValid(state: BanReasonState): boolean {
  if (!state.reason) return false;
  const detail = state.reasonDetail.trim();
  if (detail.length > REASON_DETAIL_MAX) return false;
  if (state.reason === "other") return detail.length > 0;
  return true;
}

/**
 * Maps a valid picker state to the `POST /users/:id/ban` reason fields. Detail
 * is trimmed and omitted entirely when blank (a category with no context),
 * matching the backend's "optional otherwise" contract. Callers must gate on
 * {@link isBanReasonValid} first — this narrows `reason` away from `""`.
 */
export function buildBanReasonPayload(
  state: BanReasonState,
): Pick<BanUserInput, "reason" | "reasonDetail"> {
  const detail = state.reasonDetail.trim();
  return {
    reason: state.reason as BanReason,
    ...(detail ? { reasonDetail: detail } : {}),
  };
}

export interface BanReasonPickerProps {
  value: BanReasonState;
  onChange: (next: BanReasonState) => void;
  /** Prefix for the field ids/labels so multiple pickers can coexist on a page. */
  idPrefix: string;
}

/**
 * Reusable ban-reason picker shared by every moderator ban UI. Fetches the
 * rule categories (single source of truth for the labels — never hardcoded)
 * and renders a `Select` of `{id → title}` plus an `'Other'` catch-all, with a
 * conditional detail `Textarea` that is required only for `'Other'`. Fully
 * controlled: it emits `{ reason, reasonDetail }` and never bans by itself.
 */
export function BanReasonPicker({
  value,
  onChange,
  idPrefix,
}: BanReasonPickerProps) {
  const t = useTranslations("banReason");
  const rules = useRules();

  const detailId = `${idPrefix}-ban-reason-detail`;
  const showDetail = value.reason !== "";
  const isOther = value.reason === "other";
  const detailMissing = isOther && value.reasonDetail.trim().length === 0;

  const categoryOptions: SelectOption[] = (rules.data?.categories ?? []).map(
    (c) => ({
      value: c.id,
      label: c.title,
    }),
  );
  const options: SelectOption[] = [
    { value: "", label: t("placeholder"), disabled: true },
    ...categoryOptions,
    { value: "other", label: t("other") },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
        {t("label")}
        <Select
          aria-label={t("label")}
          className="h-9"
          value={value.reason}
          disabled={rules.isLoading}
          options={options}
          onChange={(e) =>
            onChange({ ...value, reason: e.target.value as BanReason | "" })
          }
        />
      </label>

      {rules.isError && (
        <Text variant="danger" role="alert" className="text-xs">
          {t("loadError")}
        </Text>
      )}

      {showDetail && (
        <label
          htmlFor={detailId}
          className="flex flex-col gap-1 text-xs text-foreground-secondary"
        >
          {isOther ? t("detailLabelRequired") : t("detailLabelOptional")}
          <Textarea
            id={detailId}
            rows={2}
            maxLength={REASON_DETAIL_MAX}
            placeholder={t("detailPlaceholder")}
            value={value.reasonDetail}
            aria-invalid={detailMissing ? true : undefined}
            aria-describedby={detailMissing ? `${detailId}-error` : undefined}
            onChange={(e) =>
              onChange({ ...value, reasonDetail: e.target.value })
            }
          />
        </label>
      )}

      {detailMissing && (
        <Text variant="danger" id={`${detailId}-error`} className="text-xs">
          {t("detailRequired")}
        </Text>
      )}
    </div>
  );
}
