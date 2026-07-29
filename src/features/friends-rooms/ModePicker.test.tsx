import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ModePicker } from "./ModePicker";
import type { AvailableMode } from "./room-types";

const AVAILABLE: AvailableMode[] = [
  { mode: "claim", available: true, maxPlayers: 4 },
  {
    mode: "guess_who",
    available: false,
    maxPlayers: 0,
    reason: "Needs at least 5 playable rounds",
  },
];

describe("ModePicker", () => {
  it("host: renders every available mode as a clickable card and calls onChange", async () => {
    const onChange = vi.fn();
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Claim/i }));
    expect(onChange).toHaveBeenCalledWith("claim");
  });

  it("host: an unavailable mode's card is disabled and shows its reason", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost
        onChange={vi.fn()}
      />,
    );
    const guessWho = screen.getByRole("button", { name: /Guess Who/i });
    expect(guessWho).toBeDisabled();
    expect(
      screen.getByText("Needs at least 5 playable rounds"),
    ).toBeInTheDocument();
  });

  it("guest: renders the selected mode read-only, no buttons", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode="claim"
        isHost={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Claim/i)).toBeInTheDocument();
  });

  it("guest: no mode chosen yet shows a waiting note, not an empty picker", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/host is choosing/i)).toBeInTheDocument();
  });
});
