import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover } from "./Popover";

function renderPopover() {
  return render(
    <div>
      <Popover label="Filters" panelLabel="Filter options">
        {(close) => (
          <div>
            <p>Panel body</p>
            <button type="button" onClick={close}>
              Done
            </button>
          </div>
        )}
      </Popover>
      <button type="button">Outside</button>
    </div>,
  );
}

describe("Popover", () => {
  it("is closed initially and opens on trigger click", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Filters" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: "Filter options" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Panel body")).toBeInTheDocument();
  });

  it("closes when the panel calls the passed-in close()", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();
  });

  it("closes on outside pointer-down", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("Panel body")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Filters" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
