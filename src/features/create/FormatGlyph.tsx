import type { PackFormat } from "@/src/shared/types/pack";
import { cn } from "@/src/shared/lib/cn";

/**
 * Pure-CSS-shape icon per pack format, 26px tall. Decorative only — the
 * format's name renders as real text right next to it (in `FormatSection`),
 * so this carries `aria-hidden` rather than any accessible label of its own.
 *
 * Accent-colored pieces mark the format's "selected" affordance; "mute"
 * pieces use a fixed low-alpha white regardless of selection, matching the
 * mock's `rgba(243,245,248,.16)` literal exactly (not a text-* token, since
 * no token in the palette sits at that specific alpha).
 */
const MUTE_COLOR = "rgba(243,245,248,.16)";

export function FormatGlyph({
  format,
  selected,
}: {
  format: PackFormat;
  selected: boolean;
}) {
  return (
    <span aria-hidden="true" className="inline-flex h-[26px] items-center">
      {renderGlyph(format, selected)}
    </span>
  );
}

function renderGlyph(format: PackFormat, selected: boolean) {
  switch (format) {
    case "save_one":
      return <SaveOneGlyph selected={selected} />;
    case "sacrifice_one":
      return <SacrificeOneGlyph selected={selected} />;
    case "rank_blind":
      return <RankBlindGlyph selected={selected} />;
    case "nxn":
      return <NxNGlyph selected={selected} />;
    case "1v1":
      return <OneVOneGlyph selected={selected} />;
  }
}

// Accent when selected, else the muted-secondary reading of `text-foreground-
// secondary` the plan calls for (no existing call site pins an exact opacity
// for this "muted but not as-muted-as-mute" state, so `/70` is the literal
// reading of "at 70% opacity-ish").
const accentOrSecondaryClass = (selected: boolean) =>
  selected ? "bg-acc" : "bg-foreground-secondary/70";

function SaveOneGlyph({ selected }: { selected: boolean }) {
  return (
    <span className="flex items-end gap-[6px]">
      <span
        className="h-[16px] w-[16px] rounded-[3px]"
        style={{ backgroundColor: MUTE_COLOR }}
      />
      <span
        className={cn("w-[16px] rounded-[3px]", accentOrSecondaryClass(selected))}
        style={{ height: "22px" }}
      />
      <span
        className="h-[16px] w-[16px] rounded-[3px]"
        style={{ backgroundColor: MUTE_COLOR }}
      />
    </span>
  );
}

function SacrificeOneGlyph({ selected }: { selected: boolean }) {
  return (
    <span className="flex items-end gap-[6px]">
      <span
        className={cn("h-[16px] w-[16px] rounded-[3px]", accentOrSecondaryClass(selected))}
      />
      <span
        className={cn("h-[16px] w-[16px] rounded-[3px]", accentOrSecondaryClass(selected))}
      />
      <span
        className="relative h-[16px] w-[16px] rounded-[3px]"
        style={{ backgroundColor: MUTE_COLOR }}
      >
        <span
          className="absolute left-1/2 top-1/2 h-[2px] w-[14px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-danger"
        />
      </span>
    </span>
  );
}

function RankBlindGlyph({ selected }: { selected: boolean }) {
  const widths = [26, 20, 14];
  return (
    <span className="flex flex-col gap-[4px]">
      {widths.map((width, i) => (
        <span
          key={width}
          className={cn(
            "h-[4px] rounded-[3px]",
            i === 0 ? accentOrSecondaryClass(selected) : "",
          )}
          style={{
            width: `${width}px`,
            backgroundColor: i === 0 ? undefined : MUTE_COLOR,
          }}
        />
      ))}
    </span>
  );
}

function NxNGlyph({ selected }: { selected: boolean }) {
  // Diagonal pair (top-left, bottom-right) is accent; the other diagonal is
  // muted — which diagonal doesn't matter per the spec, this just picks one.
  const cells = [true, false, false, true];
  return (
    <span className="grid grid-cols-2 gap-[5px]">
      {cells.map((accent, i) => (
        <span
          key={i}
          className={cn(
            "h-[14px] w-[14px] rounded-[3px]",
            accent ? accentOrSecondaryClass(selected) : "",
          )}
          style={{ backgroundColor: accent ? undefined : MUTE_COLOR }}
        />
      ))}
    </span>
  );
}

function OneVOneGlyph({ selected }: { selected: boolean }) {
  return (
    <span className="flex flex-row items-center gap-[8px]">
      <span
        className={cn("h-[18px] w-[18px] rounded-[3px]", accentOrSecondaryClass(selected))}
      />
      <span className="text-[11px] text-foreground-tertiary">vs</span>
      <span
        className={cn("h-[18px] w-[18px] rounded-[3px]", accentOrSecondaryClass(selected))}
      />
    </span>
  );
}
