import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayRoundHeader } from "./PlayRoundHeader";

describe("PlayRoundHeader", () => {
  it("renders the eyebrow label text", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(screen.getByText("Save one")).toBeInTheDocument();
  });

  it("renders an h2 with the title", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "2016" }),
    ).toBeInTheDocument();
  });

  it("renders the instruction text when passed", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        instruction="Pick your favourite to keep."
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(
      screen.getByText("Pick your favourite to keep."),
    ).toBeInTheDocument();
  });

  it("omits the instruction when not passed", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(
      screen.queryByText("Pick your favourite to keep."),
    ).not.toBeInTheDocument();
  });

  it("defaults to centered alignment", () => {
    const { container } = render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(container.firstElementChild?.firstElementChild).toHaveClass(
      "text-center",
    );
  });

  it('reflects align="start" when passed', () => {
    const { container } = render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        align="start"
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(container.firstElementChild?.firstElementChild).toHaveClass(
      "text-start",
    );
    expect(container.firstElementChild?.firstElementChild).not.toHaveClass(
      "text-center",
    );
  });

  it("renders the 1-based round number in the badge tile", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={2}
        totalRounds={5}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders a progress-dash segment per round", () => {
    const { container } = render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={1}
        totalRounds={4}
      />,
    );

    expect(
      container.querySelectorAll('[aria-hidden="true"].rounded-pill').length -
        1,
    ).toBe(4);
  });

  it("renders the rounds-done note reflecting roundIndex", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={4}
        totalRounds={8}
      />,
    );

    expect(screen.getByText("4 rounds done")).toBeInTheDocument();
  });

  it("omits the progress-dash row when totalRounds is 0", () => {
    render(
      <PlayRoundHeader
        eyebrow="Save one"
        title="2016"
        roundIndex={0}
        totalRounds={0}
      />,
    );

    expect(screen.queryByText(/rounds done/)).not.toBeInTheDocument();
  });
});
