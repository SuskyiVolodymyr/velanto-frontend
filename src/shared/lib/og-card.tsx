/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- these cards are
   rasterised to a static PNG by Satori (next/og ImageResponse), not rendered to
   the DOM: next/image can't run there and the alt lives on the OG <meta>, not the
   pixels. */
import type { ReactElement } from "react";

/**
 * Presentational card factories for the dynamic social images (see the
 * `app/**​/social-card/route.tsx` handlers). They return plain JSX that
 * `next/og`'s ImageResponse rasterises with Satori — so every rule Satori
 * imposes applies here: explicit inline styles only (no CSS vars / classes),
 * `display: flex` on any element with more than one child, and images given
 * concrete pixel dimensions. Colours are inlined brand tokens (mirror of
 * app/globals.css) because Satori resolves neither CSS variables nor
 * stylesheets — the same reason app/opengraph-image.tsx inlines them.
 *
 * Kept free of `next/og` and Node APIs so it stays a pure, unit-testable
 * module; the route handlers own the fetching and the ImageResponse call.
 *
 * Font caveat: ImageResponse ships a Latin default only, so non-Latin titles
 * and usernames (CJK / Arabic / Devanagari) render as tofu here — the same
 * limitation the existing static brand card has. Loading multi-script fonts at
 * render time is impractical for this; accepted for now.
 */

const BG = "#0a0b0e";
const ACC = "#00e5ff";
const FG = "#f5f7fa";
const MUTED = "#9aa4b2";
const PLACEHOLDER_BG = "#1a1d24";

const ACCENT_GLOW =
  "radial-gradient(1000px 520px at 15% 0%, rgba(0,229,255,0.18), transparent 60%)";

/** A pack's share card: its cover (when set) under a scrim, with the title. */
export function packOgCard({
  title,
  imageSrc,
}: {
  title: string;
  imageSrc?: string;
}): ReactElement {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        background: BG,
        // Always a concrete value — NEVER `undefined`. Satori calls `.trim()` on
        // every style value, so a key that is present-but-undefined 500s the
        // whole card (Sentry VELANTO-FRONTEND-B). The glow is harmless under a
        // cover: the cover's own full-bleed <img> sits on top, so it only ever
        // shows on the text-only card.
        backgroundImage: ACCENT_GLOW,
      }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      {/* Scrim so the title stays readable over any cover. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          width: "100%",
          height: "100%",
          background: imageSrc
            ? "linear-gradient(180deg, rgba(10,11,14,0.35) 0%, rgba(10,11,14,0.55) 45%, rgba(10,11,14,0.94) 100%)"
            : "transparent",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "999px",
              background: ACC,
              marginRight: "16px",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: "34px",
              fontWeight: 700,
              letterSpacing: "8px",
              color: FG,
            }}
          >
            VELANTO
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "76px",
            fontWeight: 800,
            letterSpacing: "-2px",
            color: FG,
            lineHeight: 1.05,
            maxWidth: "1010px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "24px",
            fontSize: "32px",
            color: MUTED,
          }}
        >
          Play the pack on Velanto
        </div>
      </div>
    </div>
  );
}

/** A user's share card: their avatar (or initial) above their username. */
export function profileOgCard({
  username,
  imageSrc,
}: {
  username: string;
  imageSrc?: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: BG,
        backgroundImage: ACCENT_GLOW,
      }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          width={224}
          height={224}
          style={{
            width: "224px",
            height: "224px",
            borderRadius: "999px",
            objectFit: "cover",
            border: `6px solid ${ACC}`,
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "224px",
            height: "224px",
            borderRadius: "999px",
            background: PLACEHOLDER_BG,
            border: `6px solid ${ACC}`,
            fontSize: "112px",
            fontWeight: 800,
            color: ACC,
          }}
        >
          {(username.trim()[0] ?? "?").toUpperCase()}
        </div>
      )}
      <div
        style={{
          display: "flex",
          marginTop: "48px",
          fontSize: "72px",
          fontWeight: 800,
          letterSpacing: "-1px",
          color: FG,
        }}
      >
        {username}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "16px",
          fontSize: "34px",
          letterSpacing: "2px",
          color: MUTED,
        }}
      >
        on Velanto
      </div>
    </div>
  );
}
