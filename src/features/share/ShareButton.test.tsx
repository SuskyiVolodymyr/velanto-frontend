import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ShareButton } from "./ShareButton";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe("ShareButton", () => {
  it("is closed initially and opens a popover with the URL on click", () => {
    render(<ShareButton path="/packs/p1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");
    expect(input.value).toContain("/packs/p1");
  });

  it("copies the URL and shows 'Copied!' feedback", async () => {
    render(<ShareButton path="/packs/p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("/packs/p1");
    expect(
      await screen.findByRole("button", { name: "Copied!" }),
    ).toBeInTheDocument();
  });

  it("does not show 'Copied!' when the clipboard write fails", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<ShareButton path="/packs/p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Copied!" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("closes on Escape and on outside click", () => {
    render(<ShareButton path="/packs/p1" />);
    const trigger = screen.getByRole("button", { name: "Share" });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("encodes provided picks into the shared URL", () => {
    render(
      <ShareButton
        path="/packs/p1/result"
        picks={[{ groupId: "g1", itemId: "i1" }]}
        label="Share result"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Share result" }));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toContain("/packs/p1/result?p=");
  });
});
