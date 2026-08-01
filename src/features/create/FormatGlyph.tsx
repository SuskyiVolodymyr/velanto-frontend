import type { PackFormat } from "@/src/shared/types/pack";

/**
 * Each format's identity color (mock: Create Pack.dc.html's FORMATS array,
 * `hue` field — an RGB triple). Tints the icon badge always, and (see
 * FormatSection) the selected card's own border/background — not a single
 * shared accent color across every card.
 */
export const FORMAT_HUE: Record<PackFormat, string> = {
  save_one: "57,217,138",
  sacrifice_one: "255,90,90",
  "1v1": "0,229,255",
  nxn: "255,92,192",
  rank_blind: "255,194,75",
};

const FORMAT_ICON_PATH: Record<PackFormat, string> = {
  save_one: "M12 3l8 4v5c0 4.6-3.2 8.2-8 9-4.8-.8-8-4.4-8-9V7z",
  sacrifice_one: "M6 4l12 16M18 4L6 20",
  "1v1": "M7 5v14M17 5v14M10.5 12h3",
  nxn: "M4 6h6M4 12h6M4 18h6M14 6h6M14 12h6M14 18h6",
  rank_blind: "M4 6h16M4 12h11M4 18h6",
};

/**
 * The format's 28px icon badge — decorative only, the format's name renders
 * as real text right next to it (in `FormatSection`), so this carries
 * `aria-hidden` rather than any accessible label of its own.
 */
export function FormatGlyph({ format }: { format: PackFormat }) {
  const hue = FORMAT_HUE[format];
  return (
    <span
      aria-hidden="true"
      data-testid={`format-icon-${format}`}
      className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px]"
      style={{ backgroundColor: `rgba(${hue},.14)`, color: `rgb(${hue})` }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={FORMAT_ICON_PATH[format]} />
      </svg>
    </span>
  );
}
