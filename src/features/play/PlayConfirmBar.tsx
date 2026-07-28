import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface PlayConfirmBarProps {
  /** Whether a selection has been made — drives the default status copy
   * ("Locked in…" vs "Nothing picked yet") and is otherwise independent of
   * `disabled` (a caller can be ready but still want the button disabled,
   * e.g. mid-request). */
  ready: boolean;
  disabled: boolean;
  onConfirm: () => void;
  /** The button's own label, e.g. "Next round" / "See results". */
  confirmLabel: string;
  /** Overrides the default ready/pending status title — used by the
   * round-complete state (T7), which isn't a "pending pick" at all. */
  title?: string;
  /** Overrides the default status note. */
  note?: string;
  className?: string;
}

/**
 * The card-wrapped confirm bar every play screen ends its round on — status
 * copy on the left, the confirm button (with a trailing arrow) on the right.
 * Extracted once (T4) so PlayScreen/HeadToHeadPlayScreen (and RankPlayScreen's
 * round-complete "Next round" trigger, T7) share one implementation instead of
 * three hand-rolled footers.
 */
export function PlayConfirmBar({
  ready,
  disabled,
  onConfirm,
  confirmLabel,
  title,
  note,
  className,
}: PlayConfirmBarProps) {
  const t = useTranslations("play");
  const resolvedTitle =
    title ?? (ready ? t("confirmReadyTitle") : t("confirmPendingTitle"));
  const resolvedNote = note ?? t("confirmNote");

  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-center gap-4 rounded-card border border-border bg-[#171A22] p-4",
        className,
      )}
    >
      <div className="min-w-[200px] flex-1">
        <Text className="text-[14.5px] font-semibold">{resolvedTitle}</Text>
        <Text variant="tertiary" className="mt-1 text-[12.5px]">
          {resolvedNote}
        </Text>
      </div>
      <Button
        size="lg"
        disabled={disabled}
        onClick={onConfirm}
        className="ms-auto shrink-0"
      >
        {confirmLabel}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h13M13 7l5 5-5 5" />
        </svg>
      </Button>
    </div>
  );
}
