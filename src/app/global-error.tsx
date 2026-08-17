"use client";

import { useEffect } from "react";

// Last-resort boundary: only fires when the ROOT layout itself throws, so it
// must render its own <html>/<body> and can't rely on the intl/theme providers
// (they live inside the layout that just failed). Deliberately English-only and
// dependency-free — it exists so a layout-level crash shows a recover button
// instead of a blank page, not to be pretty. Everything else is caught by
// app/error.tsx, which is localized.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1a1", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#ededed",
              borderRadius: "8px",
              padding: "0.5rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
