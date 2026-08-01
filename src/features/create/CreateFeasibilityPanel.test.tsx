import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { CreateFeasibilityPanel } from "./CreateFeasibilityPanel";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import type { AvailableMode } from "@/src/features/friends-rooms/room-types";
import type { PreviewModesDraft } from "./use-preview-modes";

vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { previewModes: vi.fn() },
}));

const mockedPreviewModes = vi.mocked(friendsRoomsClient.previewModes);

const DRAFT: PreviewModesDraft = {
  format: "save_one",
  groups: [{ id: "g1", name: "Pool", items: [] }],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "random" }] }],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CreateFeasibilityPanel", () => {
  it("renders nothing before the first preview resolves", () => {
    mockedPreviewModes.mockReturnValue(new Promise(() => {}));
    render(<CreateFeasibilityPanel draft={DRAFT} debounceMs={0} />);
    expect(screen.queryByText("Friend modes unlocked")).not.toBeInTheDocument();
  });

  it("renders nothing when the format offers no modes", async () => {
    mockedPreviewModes.mockResolvedValue([]);
    render(<CreateFeasibilityPanel draft={DRAFT} debounceMs={0} />);
    await waitFor(() => expect(mockedPreviewModes).toHaveBeenCalled());
    expect(screen.queryByText("Friend modes unlocked")).not.toBeInTheDocument();
  });

  it("shows an available mode with its player range, and the full-unlocked badge", async () => {
    const modes: AvailableMode[] = [
      { mode: "claim", available: true, maxPlayers: 4 },
    ];
    mockedPreviewModes.mockResolvedValue(modes);
    render(<CreateFeasibilityPanel draft={DRAFT} debounceMs={0} />);

    expect(await screen.findByText("Friend modes unlocked")).toBeInTheDocument();
    expect(screen.getByText("Claim")).toBeInTheDocument();
    expect(screen.getByText("2-4 players")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("shows an unavailable mode's real reason and the partial-unlocked badge", async () => {
    const modes: AvailableMode[] = [
      { mode: "claim", available: true, maxPlayers: 4 },
      {
        mode: "guess_who",
        available: false,
        maxPlayers: 0,
        reason: "Needs at least 5 playable rounds",
      },
    ];
    mockedPreviewModes.mockResolvedValue(modes);
    render(<CreateFeasibilityPanel draft={DRAFT} debounceMs={0} />);

    expect(await screen.findByText("Guess Who")).toBeInTheDocument();
    expect(
      screen.getByText("Needs at least 5 playable rounds"),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("never renders a SCORED badge or a fix action (no such data from the API)", async () => {
    const modes: AvailableMode[] = [
      { mode: "guess_who", available: true, maxPlayers: 8 },
    ];
    mockedPreviewModes.mockResolvedValue(modes);
    render(<CreateFeasibilityPanel draft={DRAFT} debounceMs={0} />);

    await screen.findByText("Guess Who");
    expect(screen.queryByText("SCORED")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
