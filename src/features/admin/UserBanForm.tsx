"use client";

import { Button } from "@/src/shared/components/Button";
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
  onDurationChange: (duration: BanDuration) => void;
  onReasonChange: (reason: BanReasonState) => void;
  onConfirm: () => void;
}

/** The inline ban form: duration select + reason picker + confirm. */
export function UserBanForm({
  userId,
  banDuration,
  banReason,
  onDurationChange,
  onReasonChange,
  onConfirm,
}: UserBanFormProps) {
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
          Duration
          <select
            value={banDuration}
            onChange={(e) => onDurationChange(e.target.value as BanDuration)}
            aria-label="Ban duration"
            className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
          >
            {BAN_DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[16rem] max-w-sm flex-1">
          <BanReasonPicker idPrefix={userId} value={banReason} onChange={onReasonChange} />
        </div>
      </div>
      <Button
        variant="primary"
        className="self-start"
        disabled={!isBanReasonValid(banReason)}
        onClick={() => onConfirm()}
      >
        Confirm ban
      </Button>
    </div>
  );
}
