import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeadToHeadRound } from "./HeadToHeadRound";

const LEFT = { id: "i1", type: "text" as const, title: "Goku", value: "Goku" };
const RIGHT = {
  id: "i2",
  type: "text" as const,
  title: "Vegeta",
  value: "Vegeta",
};

describe("HeadToHeadRound", () => {
  it("renders both items in full immediately, with no reveal control", () => {
    render(<HeadToHeadRound left={LEFT} right={RIGHT} onPick={vi.fn()} />);

    expect(screen.getByText("Goku")).toBeInTheDocument();
    expect(screen.getByText("Vegeta")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show next/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onPick with the left item's id when the left card is clicked", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<HeadToHeadRound left={LEFT} right={RIGHT} onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Pick Goku" }));

    expect(onPick).toHaveBeenCalledWith("i1");
  });

  it("calls onPick with the right item's id when the right card is clicked", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<HeadToHeadRound left={LEFT} right={RIGHT} onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Pick Vegeta" }));

    expect(onPick).toHaveBeenCalledWith("i2");
  });

  it("shows a real YouTube player for a youtube item and still calls onPick via its own pick control", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const videoItem = {
      id: "v1",
      type: "youtube" as const,
      title: "Opening theme",
      value: "https://youtu.be/KsF_hdjWJjo",
    };
    render(<HeadToHeadRound left={videoItem} right={RIGHT} onPick={onPick} />);

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );
    expect(onPick).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Pick Opening theme" }),
    );
    expect(onPick).toHaveBeenCalledWith("v1");
  });
});
