import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
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
    browseLabel: "Browse",
    heading: "What's new",
    intro: "The latest features, improvements, and fixes on Velanto.",
    emptyLabel: "No updates yet — check back soon.",
    entries,
    releasesHeading: "Releases",
    latestLabel: "Latest",
    showLessLabel: "Show less",
    missingTitle: "Missing something you want?",
    missingNote:
      "Suggestions get read and voted on — a lot of the list above started there.",
    openSuggestionsLabel: "Open suggestions",
    docsLabel: "Docs",
  };

  it("renders a back-to-browse link in the header, not the brand mark", () => {
    render(<UpdatesScreen {...props} />);
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByText("VELANTO")).not.toBeInTheDocument();
  });

  it("renders each entry with its version, date, title, and bullets", () => {
    render(<UpdatesScreen {...props} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Sign in with Discord and Google",
      }),
    ).toBeInTheDocument();
    // "v1.1.0" also appears in the releases rail, so there are two.
    expect(screen.getAllByText("v1.1.0")).toHaveLength(2);
    // Rendered dd-mm-yyyy via formatDate, not the raw ISO date.
    expect(screen.getByText("18-07-2026")).toBeInTheDocument();
    expect(
      screen.getByText("Change your username any time from Settings."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Velanto is live" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("v1.0.0")).toHaveLength(2);
  });

  // Ordering is a property of the screen, not the data file — authoring order
  // must never be load-bearing.
  it("orders entries newest-first regardless of input order", () => {
    render(<UpdatesScreen {...props} entries={[entries[1], entries[0]]} />);
    const headings = within(screen.getByTestId("updates-entries"))
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

  it("marks only the first (newest) entry as LATEST", () => {
    render(<UpdatesScreen {...props} />);
    expect(screen.getAllByText("Latest")).toHaveLength(1);
  });

  it("shows a change-count badge per entry", () => {
    render(<UpdatesScreen {...props} />);
    expect(screen.getByText("2 changes")).toBeInTheDocument();
    expect(screen.getByText("1 change")).toBeInTheDocument();
  });

  it("renders a sticky releases rail with a jump-link per entry by version", () => {
    render(<UpdatesScreen {...props} />);
    const nav = screen.getByRole("navigation", { name: "Releases" });
    expect(within(nav).getByRole("link", { name: "v1.1.0" })).toHaveAttribute(
      "href",
      "#v1-1-0",
    );
    expect(within(nav).getByRole("link", { name: "v1.0.0" })).toHaveAttribute(
      "href",
      "#v1-0-0",
    );
  });

  it("renders the closing 'missing something' callout linking to Suggestions", () => {
    render(<UpdatesScreen {...props} />);
    const link = screen.getByRole("link", { name: "Open suggestions" });
    expect(link).toHaveAttribute("href", "/feedback");
  });

  it("truncates an entry's bullets to PREVIEW_BULLETS (4) with a toggle, and expanding one entry doesn't affect another", async () => {
    const user = userEvent.setup();
    const manyBullets: UpdateEntry = {
      date: "2026-07-25",
      version: "2.0.0",
      title: "A big release",
      bullets: ["one", "two", "three", "four", "five", "six"],
    };
    const otherManyBullets: UpdateEntry = {
      date: "2026-07-20",
      version: "1.9.0",
      title: "Another big release",
      bullets: ["a", "b", "c", "d", "e"],
    };
    render(
      <UpdatesScreen
        {...props}
        entries={[manyBullets, otherManyBullets, ...entries]}
      />,
    );

    // Only 4 of "A big release"'s 6 bullets render before expanding.
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("four")).toBeInTheDocument();
    expect(screen.queryByText("five")).not.toBeInTheDocument();
    expect(screen.queryByText("six")).not.toBeInTheDocument();
    // The other truncated entry is unaffected and still collapsed.
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.queryByText("e")).not.toBeInTheDocument();

    const toggles = screen.getAllByRole("button", { name: /show 2 more/i });
    expect(toggles).toHaveLength(1); // only "A big release" has exactly 2 hidden
    // The disclosure's expanded state must be programmatically determinable,
    // not conveyed by the visible label alone (WCAG 4.1.2).
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
    const controlsId = toggles[0].getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId!)).toBeInTheDocument();

    await user.click(toggles[0]);

    // Expanding "A big release" reveals the rest...
    expect(screen.getByText("five")).toBeInTheDocument();
    expect(screen.getByText("six")).toBeInTheDocument();
    const showLessButton = screen.getByRole("button", { name: /show less/i });
    expect(showLessButton).toHaveAttribute("aria-expanded", "true");
    // ...without expanding "Another big release", which stays collapsed.
    expect(screen.queryByText("e")).not.toBeInTheDocument();
  });
});
