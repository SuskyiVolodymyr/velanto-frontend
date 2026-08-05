"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Dropdown } from "@/src/shared/components/Dropdown";
import { type BanDuration } from "@/src/shared/lib/users-client";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import {
  BanReasonPicker,
  isBanReasonValid,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";

interface UserBanFormProps {
  userId: string;
  banDuration: BanDuration;
  banReason: BanReasonState;
  loading?: boolean;
  onDurationChange: (duration: BanDuration) => void;
  onReasonChange: (reason: BanReasonState) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** The inline ban form: duration select + reason picker + confirm/cancel. */
export function UserBanForm({
  userId,
  banDuration,
  banReason,
  loading = false,
  onDurationChange,
  onReasonChange,
  onConfirm,
  onCancel,
}: UserBanFormProps) {
  const t = useTranslations("ban");
  const tCommon = useTranslations("common");
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
          {t("duration")}
          <Dropdown
            value={banDuration}
            onChange={(value) => onDurationChange(value as BanDuration)}
            ariaLabel={t("durationAria")}
            size="sm"
            options={BAN_DURATIONS.map((d) => ({
              value: d.value,
              label: d.label,
            }))}
          />
        </label>
        <div className="min-w-[16rem] max-w-sm flex-1">
          <BanReasonPicker
            idPrefix={userId}
            value={banReason}
            onChange={onReasonChange}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={!isBanReasonValid(banReason)}
          loading={loading}
          onClick={() => onConfirm()}
        >
          {t("confirm")}
        </Button>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => onCancel()}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}
