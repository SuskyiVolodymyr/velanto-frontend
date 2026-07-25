import { afterEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ContinuePlayingRail } from "./ContinuePlayingRail";
import {
  writePlayResume,
  type PlayResumeRecord,
} from "@/src/features/play/play-resume-storage";

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
});
