/**
 * Shared prop shape for the hand-authored icon set in this directory — each
 * icon's raw SVG paths are copied verbatim from the design mocks (`design/`)
 * rather than approximated via a generic icon library, so nav/chrome glyphs
 * match the mock pixel-for-pixel. `size` maps to both width/height (icons are
 * square, matching every mock glyph); `strokeWidth` defaults per icon to the
 * mock's own value but stays overridable.
 */
export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}
