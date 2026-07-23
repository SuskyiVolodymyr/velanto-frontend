import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { JoinCode } from "./JoinCode";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
});

// userEvent.setup() installs its own clipboard stub, so override it AFTER setup
// with our spy — otherwise the component's writeText call lands on userEvent's.
function stubClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("JoinCode — invite link", () => {
  it("offers a Copy invite link control", () => {
    render(<JoinCode code="ABC123" />);

    expect(
      screen.getByRole("button", { name: "Copy invite link" }),
    ).toBeInTheDocument();
  });

  it("never renders the raw invite URL as visible text (stream safety)", () => {
    render(<JoinCode code="ABC123" />);

    // The link contains the code, so it must be copy-only — never on screen.
    expect(screen.queryByText(/\/rooms\/join\//)).not.toBeInTheDocument();
    expect(screen.queryByText(/ABC123/)).not.toBeInTheDocument();
  });

  it("copies the /rooms/join/<code> link to the clipboard on click", async () => {
    const user = userEvent.setup();
    stubClipboard();
    render(<JoinCode code="ABC123" />);

    await user.click(
      screen.getByRole("button", { name: "Copy invite link" }),
    );

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/rooms\/join\/ABC123$/),
    );
    // A full absolute URL — origin + path — not a bare path.
    const [copied] = writeText.mock.calls[0] as [string];
    expect(copied).toBe(`${window.location.origin}/rooms/join/ABC123`);
  });

  it("still copies the raw code (masked, without revealing it)", async () => {
    const user = userEvent.setup();
    stubClipboard();
    render(<JoinCode code="ABC123" />);

    // Code masked by default.
    expect(screen.getByTestId("join-code")).toHaveTextContent("••••••");
    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith("ABC123");
  });
});
