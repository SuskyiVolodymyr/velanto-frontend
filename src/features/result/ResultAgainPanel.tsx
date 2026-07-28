import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import { readLastPlayId } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The result aside's Share/CTA card (T12, mock lines 100–110) — replaces the
 * old bottom-of-page "Want another run?" panel AND absorbs the sticky bar's
 * Share button (ResultActions keeps only its play-again link now; see that
 * file's own doc comment).
 *
 * Three controls, matching the mock: a primary "Copy share link" (reuses
 * ShareButton's existing copy-link capability, styled `variant="primary"` for
 * the cyan treatment), then two secondary outline links — "Back to pack" and
 * a play-again link. The mock's third button there is "Play with friends",
 * explicitly OUT OF SCOPE per the plan (multiplayer rooms are still dormant)
 * — "Play again" takes its place instead, reusing `ResultActions`'s
 * shared-aware wording pattern.
 *
 * `shared`/wording note: a shared-link reader has not played this pack at
 * all, so "again" would misdescribe what they'd be doing — same reasoning
 * `ResultActions` already carried, kept here since this card now performs
 * that role too.
 */
export function ResultAgainPanel({
  packId,
  status,
  picks,
  shared,
}: {
  packId: string;
  status: Pack["status"];
  picks: RecordedPick[] | null;
  shared: boolean;
}) {
  const t = useTranslations("result");

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-[#171A22] p-5">
      <div>
        <Text className="text-base font-semibold">
          {shared ? t("shareCardTitleShared") : t("shareCardTitle")}
        </Text>
        <Text variant="secondary" className="mt-1 text-[13px]">
          {t("shareCardNote")}
        </Text>
      </div>

      {/* No Share on a shared result: the picks on screen are someone else's,
          so the only thing there is to share is the link the reader arrived
          on — offering it back invites passing off another player's run. */}
      {status === "approved" && !shared && (
        <ShareButton
          path={`/packs/${packId}/result`}
          picks={picks}
          // Read when the popover opens, not at mount — see ResultActions's
          // original comment on why this is a getter, not a value.
          resolvePlayId={() => readLastPlayId(packId)}
          label={t("copyShareLink")}
          variant="primary"
          className="w-full"
        />
      )}

      <div className="flex flex-col gap-2">
        <Link
          href={`/packs/${packId}`}
          className={buttonClassName("outline", "w-full")}
        >
          {t("backToPack")}
        </Link>
        <Link
          href={`/packs/${packId}/play`}
          className={buttonClassName("outline", "w-full")}
        >
          {shared ? t("tryItYourselfFooter") : t("playAgainFooter")}
        </Link>
      </div>
    </div>
  );
}
