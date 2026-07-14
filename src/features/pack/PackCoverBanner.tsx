import { useTranslations } from "next-intl";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { PackBannerAuthor } from "./PackBannerAuthor";
import type { Pack } from "@/src/shared/types/pack";

// Hero banner for the pack page: tinted gradient with a faint diagonal weave,
// the format badge and round count in the corners, and the title + author
// overlaid along the bottom (per the design handoff).
export function PackCoverBanner({ pack }: { pack: Pack }) {
  const tFormat = useTranslations("formats");
  const t = useTranslations("pack");
  const rounds = getRoundsCount(pack);

  return (
    <div
      className="relative min-h-[300px] overflow-hidden rounded-[20px] border border-border"
      style={{
        background: `linear-gradient(158deg, ${pack.coverTone}, #0b0c0f 78%)`,
      }}
    >
      {/* A custom cover renders first, beneath the weave + bottom-fade overlays
          (which keep the title legible over any photo) and the badges/title. */}
      {pack.coverImageKey && <CoverImage coverKey={pack.coverImageKey} />}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(122deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 16px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(9,10,13,0.82), transparent 60%)",
        }}
      />

      <div className="absolute left-5 top-5 rounded-[8px] border border-white/[0.16] bg-black/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
        {tFormat(pack.format)}
      </div>
      <div className="absolute right-5 top-5 text-xs font-medium text-white/65">
        {t("roundsCount", { count: rounds })}
      </div>

      <div className="absolute inset-x-6 bottom-6">
        <h1 className="mb-2.5 text-[clamp(28px,4vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
          {pack.title}
        </h1>
        <PackBannerAuthor pack={pack} />
      </div>
    </div>
  );
}
