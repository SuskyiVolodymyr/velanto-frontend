import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { BackButton } from "./BackButton";

const back = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

function setHistoryLength(length: number) {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    value: length,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  setHistoryLength(1);
});

describe("BackButton", () => {
  it("renders a Back control", () => {
    render(<BackButton />);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("pops in-app history when there is somewhere to go back to", async () => {
    const user = userEvent.setup();
    setHistoryLength(3);
    render(<BackButton />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to the fallback when there is no in-app history", async () => {
    const user = userEvent.setup();
    setHistoryLength(1);
    render(<BackButton fallbackHref="/feedback" />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(push).toHaveBeenCalledWith("/feedback");
    expect(back).not.toHaveBeenCalled();
  });

  it("defaults the fallback to the home feed", async () => {
    const user = userEvent.setup();
    setHistoryLength(1);
    render(<BackButton />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(push).toHaveBeenCalledWith("/");
  });
});
