import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayConfirmBar } from "./PlayConfirmBar";

describe("PlayConfirmBar", () => {
  it("shows the pending-pick title and disables the button when not ready", () => {
    render(
      <PlayConfirmBar
        ready={false}
        disabled
        onConfirm={vi.fn()}
        confirmLabel="Next round"
      />,
    );

    expect(screen.getByText("Nothing picked yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next round" })).toBeDisabled();
  });

  it("shows the ready title and an enabled button once ready", () => {
    render(
      <PlayConfirmBar
        ready
        disabled={false}
        onConfirm={vi.fn()}
        confirmLabel="Next round"
      />,
    );

    expect(
      screen.getByText("Locked in — you can still change it"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next round" }),
    ).not.toBeDisabled();
  });

  it("fires onConfirm when the button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <PlayConfirmBar
        ready
        disabled={false}
        onConfirm={onConfirm}
        confirmLabel="Next round"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next round" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("lets a caller override the title and note", () => {
    render(
      <PlayConfirmBar
        ready
        disabled={false}
        onConfirm={vi.fn()}
        confirmLabel="Next round"
        title="Round ranked"
        note="Custom note"
      />,
    );

    expect(screen.getByText("Round ranked")).toBeInTheDocument();
    expect(screen.getByText("Custom note")).toBeInTheDocument();
    expect(screen.queryByText("Nothing picked yet")).not.toBeInTheDocument();
  });
});
