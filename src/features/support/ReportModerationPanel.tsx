import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import { BanReasonPicker, isBanReasonValid } from "@/src/shared/components/BanReasonPicker";
import type { BanDuration } from "@/src/shared/lib/users-client";
import type { ReportWithReporter } from "@/src/shared/types/report";
import type { useReportModeration } from "@/src/features/support/use-report-moderation";

interface ReportModerationPanelProps {
  report: ReportWithReporter;
  moderation: ReturnType<typeof useReportModeration>;
}

export function ReportModerationPanel({ report, moderation }: ReportModerationPanelProps) {
  const {
    deleted,
    deleteError,
    handleDeletePack,
    showBanForm,
    toggleBanForm,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banError,
    banDone,
    handleBanSubmit,
  } = moderation;

  return (
    <div className="flex flex-col gap-3 rounded-[15px] border border-red-500/20 bg-red-500/[0.03] p-5">
      <Text className="text-xs font-semibold tracking-wide text-red-400">MODERATION ACTIONS</Text>
      {(report.type === "pack" || report.type === "round") && (
        <div>
          <Button variant="secondary" disabled={deleted} onClick={() => void handleDeletePack()}>
            {deleted ? "Pack deleted ✓" : "Delete pack"}
          </Button>
          {deleteError && <Text className="mt-2 text-xs text-[#ff6b6b]">{deleteError}</Text>}
        </div>
      )}
      {report.type === "user" && (
        <div>
          {!banDone && (
            <Button variant="secondary" onClick={toggleBanForm}>
              Ban user
            </Button>
          )}
          {banDone && <Text variant="secondary">User banned.</Text>}
          {showBanForm && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  Duration
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value as BanDuration)}
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
                  <BanReasonPicker idPrefix={report.targetId} value={banReason} onChange={setBanReason} />
                </div>
              </div>
              <Button
                variant="primary"
                className="self-start"
                disabled={!isBanReasonValid(banReason)}
                onClick={() => void handleBanSubmit()}
              >
                Confirm ban
              </Button>
              {banError && <Text className="text-xs text-[#ff6b6b]">{banError}</Text>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
