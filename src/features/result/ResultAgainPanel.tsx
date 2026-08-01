import Link from "next/link";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import { cn } from "@/src/shared/lib/cn";
import { readLastPlayId } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The result aside's Share/CTA card — the sticky bar carries no action of its
 * own (matches the mock exactly), so this card is the page's only way to
 * replay or share.
 *
 * Three controls, matching the mock: a primary "Copy share link" (reuses
 * ShareButton's existing copy-link capability, styled `variant="primary"` for
 * the cyan treatment), then a 2-column row of secondary outline links in the
 * mock's own order — a play-again link first, "Back to pack" second. The
 * mock's first button there is "Play with friends", explicitly OUT OF SCOPE
 * per the plan (multiplayer rooms are still dormant) — "Play again" takes its
 * place instead.
 *
 * `shared`/wording note: a shared-link reader has not played this pack at
 * all, so "again" would misdescribe what they'd be doing.
 *
 * When `canShare` is false (a shared reader, or a pack still in moderation)
 * the card falls back to plain "Your run" framing instead of the share copy
 * — the title/note used to always say "Share your run" even with no Share
 * button underneath it, which promised a control that wasn't there.
 */
export function ResultAgainPanel({
  packId,
  status,
  picks,
  shared,
  className,
}: {
  packId: string;
  status: Pack["status"];
  picks: RecordedPick[] | null;
  shared: boolean;
  /** Ordering hook for the aside's `display:contents` collapse — see
   * `ResultScreen`. */
  className?: string;
}) {
  const t = useTranslations("result");
  // No Share on a shared result: the picks on screen are someone else's, so
  // the only thing there is to share is the link the reader arrived on —
  // offering it back invites passing off another player's run. Also none for
  // a non-approved pack (ShareButton's existing rule, moved here with it).
  const canShare = status === "approved" && !shared;
  // The fallback copy (no Share button) still needs to say whose run this is
  // — a shared reader is looking at someone else's, so "Your run"/"give it
  // another go" would misdescribe both the run and what they'd be doing.
  const fallbackTitleKey = shared ? "sharedRunCardTitle" : "runCardTitle";
  const fallbackNoteKey = shared ? "sharedRunCardNote" : "runCardNote";

  return (
    <div
      className={cn(
        "flex flex-col gap-[11px] rounded-[20px] border border-border bg-surface-card p-5",
        className,
      )}
    >
      <Text className="text-[14.5px] font-bold">
        {canShare ? t("shareCardTitle") : t(fallbackTitleKey)}
      </Text>
      <Text variant="secondary" className="text-[12.5px] leading-[1.5]">
        {canShare ? t("shareCardNote") : t(fallbackNoteKey)}
      </Text>

      {canShare && (
        <ShareButton
          path={`/packs/${packId}/result`}
          picks={picks}
          // Read when the popover opens, not at mount: the play id can land
          // AFTER this card mounts (the record request resolves later), so a
          // value captured at mount would miss it.
          resolvePlayId={() => readLastPlayId(packId)}
          label={t("copyShareLink")}
          variant="primary"
          // Mock's primary is an upload glyph (a link leaving the page), not
          // the share-node icon every other ShareButton in the app uses.
          icon={<Upload size={15} aria-hidden />}
          className="w-full"
        />
      )}

      {/* Mock: a 2-column grid of secondary buttons under the primary one,
          not a vertical stack — and in the mock's own order (the play
          action first, "Back to pack" second). */}
      <div className="grid grid-cols-2 gap-[9px]">
        <Link
          href={`/packs/${packId}/play`}
          className={buttonClassName("outline", "w-full")}
        >
          {shared ? t("tryItYourselfFooter") : t("playAgainFooter")}
        </Link>
        <Link
          href={`/packs/${packId}`}
          className={buttonClassName("outline", "w-full")}
        >
          {t("backToPack")}
        </Link>
      </div>
    </div>
  );
}
