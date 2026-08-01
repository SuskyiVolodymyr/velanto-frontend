"use client";

import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type {
  PackMarks,
  MarkTarget,
} from "@/src/features/moderation/use-pack-marks";

/**
 * "Mark for edit" / "Marked" toggle. Shared by the item grid, the round list
 * and the pack-fields card so a mark looks and behaves the same wherever it is
 * made, and so only one place knows the two states' whole class strings (`cn()`
 * is a plain join — layering a colour on a base would leave both in the list).
 */
export function MarkForEditButton({
  marks,
  target,
  className,
}: {
  marks: PackMarks;
  target: MarkTarget;
  className?: string;
}) {
  const t = useTranslations("moderation");
  const marked = marks.isMarked(target.kind, target.id ?? "");
  const Icon = marked ? Check : Pencil;

  return (
    <button
      type="button"
      aria-pressed={marked}
      onClick={() => marks.toggle(target)}
      className={cn(
        "flex h-[30px] flex-none items-center gap-[7px] rounded-chip border px-2.5 text-[11.5px] font-[650] transition-colors",
        marked
          ? "border-status-pending/40 bg-status-pending/[0.14] text-status-pending"
          : "border-border bg-white/[0.04] text-foreground-secondary hover:text-foreground",
        className,
      )}
    >
      <Icon size={12} strokeWidth={2.2} aria-hidden className="flex-none" />
      {marked ? t("marked") : t("markForEdit")}
    </button>
  );
}

/**
 * The note that goes with a mark — what the author is actually being asked to
 * do. Rendered only while the thing is marked, directly under it, so the ask
 * stays attached to the thing it is about rather than collecting in one list
 * the moderator has to cross-reference.
 *
 * Optional on purpose: a mark with no note still tells the author "this one",
 * which is often all a broken link needs.
 */
export function MarkRequestField({
  marks,
  target,
  label,
  placeholder,
}: {
  marks: PackMarks;
  target: MarkTarget;
  /** Small heading above the input; omit for the compact inline variant. */
  label?: string;
  placeholder: string;
}) {
  const id = target.id ?? "";
  if (!marks.isMarked(target.kind, id)) return null;
  const mark = marks.marks.find(
    (entry) => entry.kind === target.kind && entry.id === id,
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Text
          variant="tertiary"
          className="text-[10.5px] font-bold uppercase tracking-[0.06em]"
        >
          {label}
        </Text>
      )}
      <input
        value={mark?.request ?? ""}
        onChange={(event) =>
          marks.setRequest(target.kind, id, event.target.value)
        }
        maxLength={500}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[34px] rounded-chip border border-status-pending/30 bg-surface-card px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-tertiary focus:border-status-pending"
      />
    </div>
  );
}
