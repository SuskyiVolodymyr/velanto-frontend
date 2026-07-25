import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { cn } from "@/src/shared/lib/cn";

// The pitch list's three accents map 1:1 to the semantic tokens (cyan = acc,
// green = live, magenta = hot), so no hardcoded hex here.
const PITCHES = [
  { key: "brand.pitch1", tone: "bg-acc/[0.14] text-acc" },
  { key: "brand.pitch2", tone: "bg-live/[0.14] text-live" },
  { key: "brand.pitch3", tone: "bg-hot/[0.14] text-hot" },
] as const;

// Decorative avatar cluster for the social-proof row — brand chrome, not real
// users, so it stays aria-hidden and uses fixed marketing tones.
const DECOR_AVATARS = [
  { initials: "AL", bg: "bg-[#33302a]" },
  { initials: "DV", bg: "bg-[#22322c]" },
  { initials: "RS", bg: "bg-[#35262c]" },
  { initials: "VY", bg: "bg-[#20303a]" },
];

/**
 * The left brand panel of the auth screen (UI-kit v1 `Auth.dc.html`): logo,
 * headline + subtitle, a three-point pitch list, and a social-proof row. A
 * static Server Component — no interactivity, renders on the server. It's
 * decorative to the auth *task*, so it's hidden below the split's breakpoint.
 *
 * `count` is the live registered-user total (SSR-fetched); when it's null (the
 * backend count was unavailable) the row falls back to a neutral line rather
 * than showing a broken sentence.
 */
export async function AuthBrandPanel({ count }: { count: number | null }) {
  const t = await getTranslations("auth");

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-e border-white/[0.06] bg-[linear-gradient(150deg,#1b2430_0%,#14171f_55%,#171320_100%)] p-[34px] min-[900px]:flex">
      {/* Ambient colour blobs (acc top-right, hot bottom-left). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[120px] -right-[100px] h-[420px] w-[420px] rounded-full bg-acc/[0.16] blur-[70px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[140px] -left-[80px] h-[340px] w-[340px] rounded-full bg-hot/[0.14] blur-[70px]"
      />

      <div className="relative flex items-center gap-[11px]">
        <BrandMark className="h-[30px] w-[30px]" />
        <span className="text-sm font-bold tracking-[0.22em]">VELANTO</span>
      </div>

      <div className="relative flex max-w-[460px] flex-col gap-[22px]">
        <h2 className="text-[34px] leading-[1.12] font-bold tracking-[-0.025em] text-balance">
          {t("brand.headline")}
        </h2>
        <p className="text-[15px] leading-[1.6] text-foreground-secondary text-pretty">
          {t("brand.subtitle")}
        </p>
        <ul className="flex flex-col gap-[9px] pt-1">
          {PITCHES.map((pitch) => (
            <li key={pitch.key} className="flex items-center gap-[11px]">
              <span
                className={cn(
                  "grid h-[26px] w-[26px] flex-none place-items-center rounded-chip",
                  pitch.tone,
                )}
              >
                <Check size={13} strokeWidth={2.4} aria-hidden />
              </span>
              <span className="text-[13.5px] font-semibold text-foreground/[0.78]">
                {t(pitch.key)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-3">
        <div aria-hidden className="flex">
          {DECOR_AVATARS.map((a, i) => (
            <span
              key={a.initials}
              className={cn(
                "grid h-[30px] w-[30px] flex-none place-items-center rounded-full border-2 border-surface-card text-[11px] font-bold text-foreground-secondary",
                a.bg,
                i > 0 && "-ms-[9px]",
              )}
            >
              {a.initials}
            </span>
          ))}
        </div>
        <span className="text-[13px] text-foreground-secondary">
          {count != null
            ? t("brand.socialProof", { count })
            : t("brand.socialProofFallback")}
        </span>
      </div>
    </aside>
  );
}
