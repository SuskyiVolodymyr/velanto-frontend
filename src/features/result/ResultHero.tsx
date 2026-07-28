import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { ResultTile } from "@/src/features/result/result-summary";

export interface ResultHeroProps {
  /** The pack's own title — no longer the page's `h1` (T11 moves it into the
   * subtitle; the generic "Your run is complete" copy is the `h1` now). */
  packTitle: string;
  /** A `?p=`/`?play=` viewer looking at someone else's result. */
  shared: boolean;
  totalPlays: number;
  /** `summarizeResult()`'s tiles (T10). Empty hides the whole row — "zeros are
   * a lie here, not a fallback" (D5). */
  tiles: ResultTile[];
}

/**
 * The result page's hero block (T11): eyebrow, the page's one `h1`, a subtitle
 * carrying the pack title + play count, and the D5 stat tiles.
 *
 * Mirrors `PlayRoundHeader`'s eyebrow recipe (T3) — same live-dot + uppercase
 * label shape — but is not that component: this one owns its own i18n (the
 * eyebrow copy is always `result.label`, never caller-supplied), and its title
 * is the page's `h1`, not an `h2` under someone else's `h1`.
 */
export function ResultHero({
  packTitle,
  shared,
  totalPlays,
  tiles,
}: ResultHeroProps) {
  const t = useTranslations("result");

  return (
    <div>
      <div className="flex items-center gap-[9px]">
        <span
          aria-hidden="true"
          className="h-[6px] w-[6px] rounded-pill bg-acc animate-livedot"
        />
        <Text
          variant="tertiary"
          className="text-[12.5px] font-medium uppercase tracking-[0.16em]"
        >
          {t("label")}
        </Text>
      </div>
      <Text
        as="h1"
        variant="title"
        className="mt-[10px] text-[clamp(30px,4vw,44px)] leading-[1.06] tracking-[-0.02em]"
      >
        {shared ? t("heroTitleShared") : t("heroTitle")}
      </Text>
      <Text
        variant="secondary"
        className="mt-[10px] max-w-[520px] text-[15.5px]"
      >
        {packTitle} · {t("playsRecorded", { count: totalPlays })}
      </Text>

      {tiles.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-[14px]">
          {tiles.map((tile, index) => (
            <StatTile key={`${tile.labelKey}-${index}`} tile={tile} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ tile }: { tile: ResultTile }) {
  const t = useTranslations();

  return (
    <div className="flex-1 basis-[200px] rounded-card border border-border bg-surface-card p-5">
      {tile.kind === "pick" ? (
        <Text className="text-[15px] font-semibold">{tile.title}</Text>
      ) : (
        <Text className="text-[32px] font-semibold tabular-nums text-acc">
          {tile.kind === "percent" ? `${tile.value}%` : tile.value}
        </Text>
      )}
      <Text variant="tertiary" className="mt-1 text-[12.5px]">
        {tile.kind === "pick"
          ? t(tile.labelKey, { percent: tile.percent })
          : t(tile.labelKey)}
      </Text>
    </div>
  );
}
