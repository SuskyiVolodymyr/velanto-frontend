import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeFeed } from "./HomeFeed";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: {
    create: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
  },
}));

const PACK_A: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime", "Music"],
  groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomeFeed", () => {
  it("fetches with no filters on mount and renders the results", async () => {
    vi.mocked(packsClient.list).mockResolvedValue([PACK_A]);
    render(<HomeFeed />);

    expect(await screen.findByText("Best Anime Openings")).toBeInTheDocument();
    expect(packsClient.list).toHaveBeenCalledWith({ format: undefined, tags: [] });
  });

  it("shows the empty state when no packs match", async () => {
    vi.mocked(packsClient.list).mockResolvedValue([]);
    render(<HomeFeed />);

    expect(await screen.findByText("No packs match these filters yet.")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(packsClient.list).mockRejectedValue(new Error("network error"));
    render(<HomeFeed />);

    expect(await screen.findByText("Couldn't load packs. Try again later.")).toBeInTheDocument();
  });

  it("re-fetches with the selected format when a format chip is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue([PACK_A]);
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    await user.click(screen.getByRole("button", { name: "Sacrifice One" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({ format: "sacrifice_one", tags: [] }),
    );
  });

  it("re-fetches with selected tags (additive) when tag chips are toggled", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue([PACK_A]);
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    await user.click(screen.getByRole("button", { name: "Anime" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({ format: undefined, tags: ["Anime"] }),
    );

    await user.click(screen.getByRole("button", { name: "Music" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: undefined,
        tags: ["Anime", "Music"],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Anime" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({ format: undefined, tags: ["Music"] }),
    );
  });

  it("includes a 1v1 filter chip", async () => {
    vi.mocked(packsClient.list).mockResolvedValue([]);
    render(<HomeFeed />);
    expect(await screen.findByRole("button", { name: "1v1" })).toBeInTheDocument();
  });
});
