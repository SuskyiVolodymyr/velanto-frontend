import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomInvitePanel } from "./RoomInvitePanel";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
});

// userEvent.setup() installs its own clipboard stub, so override it AFTER setup
// with our spy — otherwise the component's writeText call lands on userEvent's.
function stubClipboard(impl = writeText) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: impl },
    configurable: true,
  });
}

function panel(props: Partial<Parameters<typeof RoomInvitePanel>[0]> = {}) {
  return (
    <RoomInvitePanel code="ABC123" locked={false} onLock={vi.fn()} {...props} />
  );
}

describe("RoomInvitePanel — stream safety", () => {
  it("never renders the code or the invite URL as visible text by default", () => {
    render(panel());

    // The link contains the code, so it is copy-only — never on screen at all.
    expect(screen.queryByText(/\/rooms\/join\//)).not.toBeInTheDocument();
    expect(screen.queryByText(/ABC123/)).not.toBeInTheDocument();
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
  });

  it("reveals the code only on an explicit press, and hides it again", async () => {
    const user = userEvent.setup();
    render(panel());

    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(screen.getByTestId("join-code")).toHaveTextContent("ABC123");

    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
  });

  it("copies the /rooms/join/<code> link without revealing anything", async () => {
    const user = userEvent.setup();
    stubClipboard();
    render(panel());

    await user.click(screen.getByRole("button", { name: "Copy invite link" }));

    // A full absolute URL — origin + path — not a bare path.
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/rooms/join/ABC123`,
    );
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
  });

  it("copies the raw code, still masked", async () => {
    const user = userEvent.setup();
    stubClipboard();
    render(panel());

    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith("ABC123");
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
  });

  // Clipboard blocked (denied permission, insecure context). The code falls back
  // to a reveal so the host can read it out; the LINK never does, because
  // showing it would put the code on the shared screen anyway.
  it("falls back to revealing the code when the clipboard is refused", async () => {
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(panel());

    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(screen.getByTestId("join-code")).toHaveTextContent("ABC123");
  });

  it("does not fall back to showing the invite link", async () => {
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(panel());

    await user.click(screen.getByRole("button", { name: "Copy invite link" }));
    expect(screen.queryByText(/\/rooms\/join\//)).not.toBeInTheDocument();
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
  });
});

describe("RoomInvitePanel — room lock", () => {
  it("reports the lock as a switch and toggles it", async () => {
    const user = userEvent.setup();
    const onLock = vi.fn();
    render(panel({ onLock }));

    const lock = screen.getByRole("switch", { name: "Lock room" });
    expect(lock).toHaveAttribute("aria-checked", "false");

    await user.click(lock);
    expect(onLock).toHaveBeenCalledWith(true);
  });

  it("offers to unlock a locked room", async () => {
    const user = userEvent.setup();
    const onLock = vi.fn();
    render(panel({ locked: true, onLock }));

    await user.click(screen.getByRole("switch", { name: "Lock room" }));
    expect(onLock).toHaveBeenCalledWith(false);
  });

  // A locked/finished room releases its code. There is nothing to copy or
  // reveal, and offering the controls anyway would be a dead end.
  it("drops the code controls once the room has no code", () => {
    render(panel({ code: null }));

    expect(screen.queryByTestId("join-code")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy invite link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This room is no longer accepting new players."),
    ).toBeInTheDocument();
  });
});
