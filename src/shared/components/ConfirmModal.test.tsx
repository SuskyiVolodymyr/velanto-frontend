import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ConfirmModal } from "@/src/shared/components/ConfirmModal";

function setup(
  overrides: Partial<React.ComponentProps<typeof ConfirmModal>> = {},
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete this pack?"
      message="This can't be undone."
      confirmLabel="Delete pack"
      cancelLabel="Cancel"
      {...overrides}
    />,
  );
  return { onClose, onConfirm };
}

describe("ConfirmModal", () => {
  it("renders the title, message, and both actions when open", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "Delete this pack?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete pack" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(
      screen.queryByRole("heading", { name: "Delete this pack?" }),
    ).not.toBeInTheDocument();
  });

  it("calls onConfirm when the confirm action is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Delete pack" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the cancel action is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when one is given", () => {
    setup({ error: "Couldn't delete the pack. Try again." });
    expect(
      screen.getByText("Couldn't delete the pack. Try again."),
    ).toHaveAttribute("role", "alert");
  });

  it("disables both actions while confirming is in flight", () => {
    setup({ confirming: true });
    expect(screen.getByRole("button", { name: "Delete pack" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
