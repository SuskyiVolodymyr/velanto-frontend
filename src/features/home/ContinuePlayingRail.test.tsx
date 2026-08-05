import { afterEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ContinuePlayingRail } from "./ContinuePlayingRail";
import {
  writePlayResume,
  type PlayResumeRecord,
} from "@/src/features/play/play-resume-storage";
import { consumePlayIntent } from "@/src/features/play/play-intent-storage";

function record(over: Partial<PlayResumeRecord> = {}): PlayResumeRecord {
  return {
    packId: "p1",
    seed: 1,
    packVersion: "v1",
    roundIndex: 4,
    choices: [],
    pack: { title: "Save one anime", coverTone: "#2b2a3a", totalRounds: 8 },
    updatedAt: Date.now(),
    ...over,
  };
}

afterEach(() => {
  localStorage.clear();
});

describe("ContinuePlayingRail", () => {
  it("renders nothing when there are no saved plays", () => {
    const { container } = render(<ContinuePlayingRail />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a resume card per saved play, freshest first", async () => {
    const now = Date.now();
    writePlayResume(
      record({
        packId: "older",
        updatedAt: now - 2000,
        pack: { title: "Older pack", coverTone: "#20303a", totalRounds: 6 },
      }),
    );
    writePlayResume(
      record({
        packId: "newer",
        updatedAt: now - 1000,
        pack: { title: "Newer pack", coverTone: "#33302a", totalRounds: 10 },
      }),
    );

    render(<ContinuePlayingRail />);

    await screen.findByText("Continue playing");
    const titles = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector("p")?.textContent);
    expect(titles).toEqual(["Newer pack", "Older pack"]);
  });

  it("skips a record whose display snapshot is missing without crashing", async () => {
    writePlayResume(
      record({
        packId: "ok",
        pack: { title: "Good pack", coverTone: "#2b2a3a", totalRounds: 4 },
      }),
    );
    // A resume-valid record with no display snapshot (storage keeps it so the
    // pack still resumes, but the rail can't render a card for it).
    localStorage.setItem(
      "velanto:play-resume:snapshotless",
      JSON.stringify({
        packId: "snapshotless",
        seed: 1,
        packVersion: "v1",
        roundIndex: 1,
        choices: [],
        updatedAt: Date.now(),
      }),
    );

    render(<ContinuePlayingRail />);

    await screen.findByText("Good pack");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  // The rail used to show a bare tone swatch because the resume snapshot never
  // stored the cover key — so a pack lost its face the moment you half-played
  // it, while the same pack in the feed beside it kept it.
  it("shows the pack's real cover when the snapshot has one", async () => {
    writePlayResume(
      record({
        pack: {
          title: "Save one anime",
          coverTone: "#2b2a3a",
          coverImageKey: "covers/abc.webp",
          totalRounds: 8,
        },
      }),
    );
    render(<ContinuePlayingRail />);

    await screen.findByText("Save one anime");
    const cover = document.querySelector("img[src*='covers/abc.webp']");
    expect(cover).toBeInTheDocument();
  });

  // Records written before the field existed are still perfectly good plays.
  it("falls back to the tone swatch for a snapshot with no cover", async () => {
    writePlayResume(record());
    render(<ContinuePlayingRail />);

    await screen.findByText("Save one anime");
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows round progress and links each card to its play route to resume", async () => {
    writePlayResume(
      record({
        packId: "pack-9",
        roundIndex: 4,
        pack: { title: "Save one anime", coverTone: "#2b2a3a", totalRounds: 8 },
      }),
    );

    render(<ContinuePlayingRail />);

    // roundIndex 4 (4 rounds done) → resuming into round 5 of 8.
    await screen.findByText("Round 5 of 8");
    const resume = screen.getByRole("link", { name: "Resume Save one anime" });
    expect(resume).toHaveAttribute("href", "/packs/pack-9/play");
  });

  // This card's whole point is "pick up where I left off" — clicking it must
  // never route through the resume-choice modal; it signals its own answer
  // before the destination even mounts.
  it("signals a silent continue before navigating, so the destination never asks", async () => {
    writePlayResume(
      record({
        packId: "pack-9",
        pack: { title: "Save one anime", coverTone: "#2b2a3a", totalRounds: 8 },
      }),
    );
    const user = userEvent.setup();
    render(<ContinuePlayingRail />);

    await user.click(
      await screen.findByRole("link", { name: "Resume Save one anime" }),
    );

    expect(consumePlayIntent("pack-9")).toBe("continue");
  });
});
