import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayRoundHeader } from "./PlayRoundHeader";

describe("PlayRoundHeader", () => {
  it("renders the eyebrow label text", () => {
    render(<PlayRoundHeader eyebrow="Save one" title="2016" />);

    expect(screen.getByText("Save one")).toBeInTheDocument();
  });

  it("renders an h2 with the title", () => {
    render(<PlayRoundHeader eyebrow="Save one" title="2016" />);

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
      />,
    );

    expect(
      screen.getByText("Pick your favourite to keep."),
    ).toBeInTheDocument();
  });

  it("omits the instruction when not passed", () => {
    render(<PlayRoundHeader eyebrow="Save one" title="2016" />);

    expect(
      screen.queryByText("Pick your favourite to keep."),
    ).not.toBeInTheDocument();
  });

  it("defaults to centered alignment", () => {
    const { container } = render(
      <PlayRoundHeader eyebrow="Save one" title="2016" />,
    );

    expect(container.firstElementChild).toHaveClass("text-center");
  });

  it("reflects align=\"start\" when passed", () => {
    const { container } = render(
      <PlayRoundHeader eyebrow="Save one" title="2016" align="start" />,
    );

    expect(container.firstElementChild).toHaveClass("text-start");
    expect(container.firstElementChild).not.toHaveClass("text-center");
  });
});
