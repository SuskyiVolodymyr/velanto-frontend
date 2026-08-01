"use client";

import { cn } from "@/src/shared/lib/cn";

export interface SwatchPickerProps {
  /** Colours to offer, as CSS colour strings (the current use passes hex).
   * `readonly` so a `const` tuple like `COVER_TONES` passes without a copy. */
  swatches: readonly string[];
  /** The currently selected colour. */
  value: string;
  onChange: (color: string) => void;
  /** Accessible label for a swatch (e.g. a localized "Cover tone …"). */
  getLabel: (color: string) => string;
  className?: string;
  /**
   * `"solid"` (default) is the UI-kit v1 flat chip with a white selection
   * ring + check glyph — unchanged, so every existing caller/test stays
   * byte-identical. `"gradient"` is the v2 mock's fade-to-near-black tile:
   * no check, the border colour alone is the selection cue.
   */
  swatchStyle?: "solid" | "gradient";
}

/**
 * Perceptual luminance → a readable check colour: a dark check on light chips,
 * a light check on dark ones. The mock draws a dark check because its example
 * chips are bright accents; our cover tones are dark, so a fixed dark check
 * would vanish — hence the adaptive choice. Falls back to the light check (safe
 * on a dark chip) for any colour that isn't a parseable hex.
 */
function checkColor(color: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return "#EEF1F6";
  const h =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : m[1];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.6 ? "#0B0D12" : "#EEF1F6";
}

/**
 * A single-select row of colour swatches. Default `swatchStyle="solid"` is
 * the UI-kit v1 "AccentSwatches" chip: 34px rounded, the selected one ringed
 * in white with a check. Opt-in `swatchStyle="gradient"` is the v2 mock's
 * 38px fade-to-near-black tile, selection cued by an accent border instead
 * of a check. Used by the pack cover-tone picker; generic over any colour list.
 */
export function SwatchPicker({
  swatches,
  value,
  onChange,
  getLabel,
  className,
  swatchStyle = "solid",
}: SwatchPickerProps) {
  const gradient = swatchStyle === "gradient";
  return (
    <div className={cn("flex flex-wrap gap-[9px]", className)}>
      {swatches.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={getLabel(color)}
            aria-pressed={selected}
            style={{
              background: gradient
                ? `linear-gradient(150deg, ${color}, var(--background))`
                : color,
            }}
            className={cn(
              "grid flex-none place-items-center border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc/60",
              gradient
                ? "h-[38px] w-[38px] rounded-[10px]"
                : "h-[34px] w-[34px] rounded-[11px]",
              gradient
                ? selected
                  ? "border-acc"
                  : "border-white/[0.12]"
                : selected
                  ? "border-white"
                  : "border-white/15",
            )}
          >
            {!gradient && selected && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={checkColor(color)}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
