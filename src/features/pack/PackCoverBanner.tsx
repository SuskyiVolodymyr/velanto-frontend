import { useTranslations } from "next-intl";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { isHotPack } from "@/src/features/home/hot-pack";
import { PackBannerAuthor } from "./PackBannerAuthor";
import type { Pack } from "@/src/shared/types/pack";

// Hero banner for the pack page: a tinted gradient fading to near-black, with
// the format pill (+ a derived HOT pill) and the title/author overlaid along the
// bottom (per the 2.0.0 design). A custom cover image renders beneath the scrim.
export function PackCoverBanner({ pack }: { pack: Pack }) {
  const tFormat = useTranslations("formats");
  const tHome = useTranslations("home.card");

  return (
    <section
      className="relative flex h-[280px] items-end overflow-hidden rounded-[22px] border border-border p-6 max-[720px]:h-[200px] max-[720px]:rounded-b-[18px]"
      style={{
        background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
      }}
    >
      {pack.coverImageKey && <CoverImage coverKey={pack.coverImageKey} />}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,12,15,0) 30%, rgba(11,12,15,0.88) 100%)",
        }}
      />

      <div className="relative flex max-w-[760px] flex-col gap-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-acc/[0.16] px-[11px] py-1 text-[11.5px] font-bold tracking-[0.04em] text-[#8CF3FF]">
            {tFormat(pack.format)}
          </span>
          {isHotPack(pack) && (
            <span className="rounded-pill bg-hot/85 px-[11px] py-1 text-[11.5px] font-bold text-[#150912]">
              {tHome("hot")}
            </span>
          )}
        </div>
        <h1 className="text-[clamp(26px,4vw,36px)] font-bold leading-[1.08] tracking-[-0.03em] text-white text-pretty">
          {pack.title}
        </h1>
        <PackBannerAuthor pack={pack} />
      </div>
    </section>
  );
}
