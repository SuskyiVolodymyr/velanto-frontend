import { ImageResponse } from "next/og";

// Static default social-share card for the whole site (Open Graph + Twitter).
// Rendered by Satori from the JSX below — no binary asset to maintain. Per-page
// dynamic cards (e.g. a pack's own title/cover) can be added later by dropping
// an opengraph-image.tsx into that route segment.

export const alt = "Velanto — create and play elimination quiz packs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens, inlined because Satori resolves neither CSS variables nor
// external stylesheets (mirror of app/globals.css --background / --acc).
const BG = "#0a0b0e";
const ACC = "#00e5ff";
const FG = "#f5f7fa";
const MUTED = "#9aa4b2";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: BG,
        // Soft accent glow anchored top-left for a bit of depth.
        backgroundImage: `radial-gradient(1000px 500px at 15% 0%, rgba(0,229,255,0.18), transparent 60%)`,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: "120px",
          height: "12px",
          borderRadius: "999px",
          background: ACC,
          marginBottom: "44px",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: "150px",
          fontWeight: 800,
          letterSpacing: "-4px",
          color: FG,
          lineHeight: 1,
        }}
      >
        Velanto
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "32px",
          fontSize: "44px",
          color: MUTED,
          maxWidth: "900px",
          lineHeight: 1.25,
        }}
      >
        Create and play elimination quiz packs — see who&apos;s left standing.
      </div>
    </div>,
    { ...size },
  );
}
