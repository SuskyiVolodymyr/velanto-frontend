import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpdatesScreen } from "./UpdatesScreen";
import type { UpdateEntry } from "./updates-data";

describe("UpdatesScreen", () => {
  const entries: UpdateEntry[] = [
    {
      date: "2026-07-18",
      version: "1.1.0",
      title: "Sign in with Discord and Google",
      bullets: [
        "One-tap sign-in with your Discord or Google account.",
        "Change your username any time from Settings.",
      ],
    },
    {
      date: "2026-07-14",
      version: "1.0.0",
      title: "Velanto is live",
      bullets: [
        "Create packs in five formats and play them with the community.",
      ],
    },
  ];

  const props = {
    heading: "What's new",
    intro: "The latest features, improvements, and fixes on Velanto.",
    emptyLabel: "No updates yet — check back soon.",
    entries,
  };

  it("renders each entry with its version, date, title, and bullets", () => {
    render(<UpdatesScreen {...props} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Sign in with Discord and Google",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("v1.1.0")).toBeInTheDocument();
    // Rendered dd-mm-yyyy via formatDate, not the raw ISO date.
    expect(screen.getByText("18-07-2026")).toBeInTheDocument();
    expect(
      screen.getByText("Change your username any time from Settings."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Velanto is live" }),
    ).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  // Ordering is a property of the screen, not the data file — authoring order
  // must never be load-bearing.
  it("orders entries newest-first regardless of input order", () => {
    render(<UpdatesScreen {...props} entries={[entries[1], entries[0]]} />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Sign in with Discord and Google",
      "Velanto is live",
    ]);
  });

  it("shows an empty state and no entries when the list is empty", () => {
    render(<UpdatesScreen {...props} entries={[]} />);
    expect(
      screen.getByText("No updates yet — check back soon."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
