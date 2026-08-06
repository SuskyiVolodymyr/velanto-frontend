import { useFormatter } from "next-intl";
import { Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";

export interface HeroStat {
  label: string;
  value: number;
}

/**
 * The "you finished" hero: a cyan-tinted panel with a check badge, an eyebrow,
 * the page's one `h1`, a note, and a compact stat row pinned to the end —
 * `Results.dc.html`'s hero, including its gradient/border treatment.
 *
 * Promoted out of `features/result` when the friends-room results screen needed
 * the same opening statement. It is presentation only: every string is a prop,
 * because the two callers read different message catalogs and say different
 * things ("here's what you saved" vs "here's what the room picked"). What they
 * must NOT differ on is how it looks, which is the entire reason this is one
 * component and not two — the room's first version was a hand-built lookalike
 * with a different radius, tint and type scale, and it read as a different app.
 */
export function HeroCard({
  eyebrow,
  title,
  note,
  stats,
}: {
  eyebrow: string;
  title: string;
  note: string;
  stats: HeroStat[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-[18px] rounded-[20px] border border-acc/30 bg-gradient-to-br from-acc/[0.12] to-acc/[0.02] p-[22px]">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px] bg-acc/[0.16] text-acc-hover"
      >
        <Check size={26} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-col gap-[5px]">
        <span className="text-[11px] font-bold tracking-[0.16em] text-acc-hover uppercase">
          {eyebrow}
        </span>
        <Text
          as="h1"
          variant="title"
          className="text-[30px] leading-[1.06] font-bold tracking-[-0.025em] text-pretty max-[720px]:text-[26px]"
        >
          {title}
        </Text>
        <Text variant="secondary" className="text-[13.5px] text-pretty">
          {note}
        </Text>
      </div>
      {/* The mock's `heroStats`, rendered INSIDE the card beside the message
          rather than as its own row above or below it. */}
      <div className="ms-auto flex gap-[22px]">
        {stats.map((stat) => (
          <CompactStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </div>
  );
}

function CompactStat({ label, value }: HeroStat) {
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-[3px]">
      <Text className="font-mono text-[22px] font-bold tracking-[-0.01em] tabular-nums">
        {/* Mock shows "2,142" — a four-figure play count without grouping
            reads as an id, not a quantity. */}
        {format.number(value)}
      </Text>
      <Text
        variant="tertiary"
        className="text-[11px] font-semibold tracking-[0.06em] uppercase"
      >
        {label}
      </Text>
    </div>
  );
}
