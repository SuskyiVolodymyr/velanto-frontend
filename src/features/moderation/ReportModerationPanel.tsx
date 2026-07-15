"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import {
  BanReasonPicker,
  isBanReasonValid,
} from "@/src/shared/components/BanReasonPicker";
import type { BanDuration } from "@/src/shared/lib/users-client";
import type { ReportWithReporter } from "@/src/shared/types/report";
import type { useReportModeration } from "@/src/features/moderation/use-report-moderation";

interface ReportModerationPanelProps {
  report: ReportWithReporter;
  moderation: ReturnType<typeof useReportModeration>;
}

export function ReportModerationPanel({
  report,
  moderation,
}: ReportModerationPanelProps) {
  const t = useTranslations("moderation");
  const tBan = useTranslations("ban");
  const {
    deleted,
    deleting,
    deleteError,
    handleDeletePack,
    showBanForm,
    toggleBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banError,
    banSubmitting,
    banDone,
    handleBanSubmit,
  } = moderation;

  return (
    <div className="flex flex-col gap-3 rounded-[15px] border border-red-500/20 bg-red-500/[0.03] p-5">
      <Text className="text-xs font-semibold tracking-wide text-red-400">
        {t("actionsHeading")}
      </Text>
      {(report.type === "pack" || report.type === "round") && (
        <div>
          <Button
            variant="secondary"
            disabled={deleted}
            loading={deleting}
            onClick={() => void handleDeletePack()}
          >
            {deleted ? `${t("packDeleted")} ✓` : t("deletePack")}
          </Button>
          {deleteError && (
            <Text className="mt-2 text-xs text-danger">{deleteError}</Text>
          )}
        </div>
      )}
      {report.type === "user" && (
        <div>
          {!banDone && (
            <Button variant="secondary" onClick={toggleBanForm}>
              {tBan("banUser")}
            </Button>
          )}
          {banDone && <Text variant="secondary">{tBan("userBanned")}</Text>}
          {showBanForm && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  {tBan("duration")}
                  <select
                    value={banDuration}
                    onChange={(e) =>
                      setBanDuration(e.target.value as BanDuration)
                    }
                    aria-label={tBan("durationAria")}
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
                  <BanReasonPicker
                    idPrefix={report.targetId}
                    value={banReason}
                    onChange={setBanReason}
                  />
                </div>
              </div>
              <Button
                variant="primary"
                className="self-start"
                disabled={!isBanReasonValid(banReason)}
                loading={banSubmitting}
                onClick={() => void handleBanSubmit()}
              >
                {tBan("confirm")}
              </Button>
              {banError && (
                <Text className="text-xs text-danger">{banError}</Text>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
