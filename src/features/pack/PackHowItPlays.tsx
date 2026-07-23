import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { PackFormat } from "@/src/shared/types/pack";

type Step = { title: string; desc: string };

export function PackHowItPlays({ format }: { format: PackFormat }) {
  const t = useTranslations("pack");
  // The per-format step list is stored as structured JSON in the catalog, so
  // read it raw rather than key-by-key.
  //
  // `t.raw` on a MISSING key returns next-intl's fallback STRING, not undefined
  // — so `.map` would throw and, because PackDetailScreen is a Server Component
  // that renders this unconditionally, take the whole public pack page down with
  // a 500. Check the shape at the point of use rather than trusting the catalog:
  // this covers a plain catalog typo or a format from a backend deployed ahead
  // of this build (every shipped format, save_one_friends included, has steps).
  const raw: unknown = t.raw(`howItPlays.${format}`);
  if (!Array.isArray(raw)) return null;
  const steps = raw as Step[];

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-white/[0.02] p-[18px]"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white/[0.06] text-[12.5px] font-semibold text-foreground-secondary">
            {index + 1}
          </span>
          <Text className="text-[14.5px] font-semibold">{step.title}</Text>
          <Text variant="secondary" className="text-[13px] leading-relaxed">
            {step.desc}
          </Text>
        </div>
      ))}
    </div>
  );
}
