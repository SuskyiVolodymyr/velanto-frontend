import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("hides its content until the trigger is hovered or focused", () => {
    render(
      <Tooltip content="Log in to vote">
        <button>Vote</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("reveals the reason on pointer hover and hides it again on leave", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Log in to vote">
        <button>Vote</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Vote" });

    await user.hover(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await user.unhover(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("reveals the reason on keyboard focus and hides it on blur", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Log in to vote">
        <button>Vote</button>
      </Tooltip>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Vote" })).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("describes the trigger with the tooltip while open (aria-describedby)", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Log in to vote">
        <button>Vote</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Vote" });

    await user.hover(trigger);
    const tip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tip.id);
  });
});
