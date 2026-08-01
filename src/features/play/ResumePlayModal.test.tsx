import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResumePlayModal } from "@/src/features/play/ResumePlayModal";

describe("ResumePlayModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ResumePlayModal
        open={false}
        onContinue={vi.fn()}
        onRestart={vi.fn()}
        roundsDone={2}
      />,
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the title, the rounds-done note, and both actions when open", () => {
    render(
      <ResumePlayModal
        open
        onContinue={vi.fn()}
        onRestart={vi.fn()}
        roundsDone={2}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Continue where you left off?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 rounds done")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start over" }),
    ).toBeInTheDocument();
  });

  it("calls onContinue when Continue is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onRestart = vi.fn();
    render(
      <ResumePlayModal
        open
        onContinue={onContinue}
        onRestart={onRestart}
        roundsDone={1}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onRestart).not.toHaveBeenCalled();
  });

  it("calls onRestart when Start over is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onRestart = vi.fn();
    render(
      <ResumePlayModal
        open
        onContinue={onContinue}
        onRestart={onRestart}
        roundsDone={1}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("has no dismiss control — Escape does not close it", async () => {
    // There is no safe "do nothing" here: the screen behind this modal shows
    // no round content until the player picks one of the two real actions.
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onRestart = vi.fn();
    render(
      <ResumePlayModal
        open
        onContinue={onContinue}
        onRestart={onRestart}
        roundsDone={1}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /close/i }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
    expect(onRestart).not.toHaveBeenCalled();
  });
});
