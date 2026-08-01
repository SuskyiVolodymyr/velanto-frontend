import { screen, within } from "@testing-library/react";
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

  it("host: an unavailable mode's card is inert, focusable, and shows its reason", async () => {
    const onChange = vi.fn();
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost
        onChange={onChange}
      />,
    );
    const guessWho = screen.getByRole("button", { name: /Guess Who/i });
    // aria-disabled rather than `disabled`, so the reason stays reachable by
    // keyboard/AT — but clicking it must still do nothing.
    expect(guessWho).toHaveAttribute("aria-disabled", "true");
    expect(guessWho).not.toBeDisabled();
    await userEvent.click(guessWho);
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText("Needs at least 5 playable rounds"),
    ).toBeInTheDocument();
    // maxPlayers is 0 on an unavailable mode — the pack can seat nobody for it
    // — which rendered as "3-0 players". The card falls back to the mode's own
    // ceiling so it still says what the mode is for.
    expect(within(guessWho).getByText("3-8 players")).toBeInTheDocument();
  });

  // A guest used to get a one-line summary of the host's pick. The mock shows
  // them the same grid — they're deciding whether to ready up, and "Claim" on
  // its own doesn't tell them what they'd be agreeing to.
  it("guest: sees every mode, marked but not clickable", async () => {
    const onChange = vi.fn();
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode="claim"
        isHost={false}
        onChange={onChange}
      />,
    );

    const claim = screen.getByRole("button", { name: /Claim/i });
    expect(claim).toHaveAttribute("aria-pressed", "true");
    expect(claim).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /Guess Who/i })).toBeVisible();

    await userEvent.click(claim);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("guest: nothing is marked before the host has picked", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost={false}
        onChange={vi.fn()}
      />,
    );
    for (const card of screen.getAllByRole("button")) {
      expect(card).toHaveAttribute("aria-pressed", "false");
    }
  });
});
