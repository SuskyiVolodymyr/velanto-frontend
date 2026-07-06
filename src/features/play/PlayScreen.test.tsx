import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayScreen } from "./PlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: {
    record: vi.fn().mockResolvedValue({ id: "play-1" }),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const SAVE_ONE_PACK: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      selectionMode: "manual",
      items: [textItem("1", "Guren no Yumiya"), textItem("2", "Redo")],
    },
    {
      id: "g2",
      name: "2020",
      selectionMode: "manual",
      items: [textItem("3", "Silhouette")],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderScreen(pack: Pack) {
  return render(
    <AuthProvider>
      <PlayScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "t", user: MOCK_USER });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("PlayScreen", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new ApiError(401, "Unauthorized", null));
    renderScreen(SAVE_ONE_PACK);

    expect(await screen.findByText("You need to be logged in to play a pack.")).toBeInTheDocument();
  });

  const NXN_PACK: Pack = {
    id: "pack-nxn",
    title: "Boys vs Girls",
    description: "Pick a side each round.",
    coverTone: "#2b2a3a",
    format: "nxn",
    tags: ["Anime"],
    categories: [
      { id: "ca", name: "Boys", items: [textItem("1", "Naruto"), textItem("2", "Sasuke")] },
      { id: "cb", name: "Girls", items: [textItem("3", "Sakura"), textItem("4", "Hinata")] },
    ],
    versusRounds: 2,
    versusN: 2,
    authorId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("derives the reveal count from the actual sampled items, not a possibly-stale versusN", async () => {
    const user = userEvent.setup();
    const shortPack: Pack = {
      ...NXN_PACK,
      categories: [
        { id: "ca", name: "Boys", items: [textItem("1", "Naruto")] },
        { id: "cb", name: "Girls", items: [textItem("3", "Sakura"), textItem("4", "Hinata")] },
      ],
    };
    renderScreen(shortPack);
    await screen.findByRole("button", { name: "Pick Boys" });

    expect(screen.getByText("Showing 1 of 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(screen.getByRole("button", { name: "Next round →" })).toBeEnabled();
  });

  it("renders nxn rounds as two side-by-side categories with a VS divider", async () => {
    renderScreen(NXN_PACK);

    expect(await screen.findByRole("button", { name: "Pick Boys" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pick Girls" })).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
  });

  it("keeps nxn's Next round disabled until both sides are revealed and a side is picked", async () => {
    const user = userEvent.setup();
    renderScreen(NXN_PACK);
    await screen.findByRole("button", { name: "Pick Boys" });

    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(screen.getByRole("button", { name: "Next round →" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByText("Showing 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next round →" })).toBeEnabled();
  });

  it("advances through nxn rounds and records picks with round index as groupId, category id as itemId", async () => {
    const user = userEvent.setup();
    renderScreen(NXN_PACK);
    await screen.findByRole("button", { name: "Pick Boys" });

    await user.click(screen.getByRole("button", { name: "Show all" }));
    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Round 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show all" }));
    await user.click(screen.getByRole("button", { name: "Pick Girls" }));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("All rounds done")).toBeInTheDocument();
    expect(
      screen.getByText("You picked a side in 2 rounds between Boys and Girls."),
    ).toBeInTheDocument();
    expect(playsClient.record).toHaveBeenCalledWith("pack-nxn", {
      picks: [
        { groupId: "0", itemId: "ca" },
        { groupId: "1", itemId: "cb" },
      ],
    });
  });

  it("keeps Next round disabled until every item in the round is revealed", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByText("Guren no Yumiya"));
    expect(screen.getByRole("button", { name: "Next round →" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByText("Showing 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next round →" })).toBeEnabled();
  });

  it("requires a selection before confirming, even once everything is revealed", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("button", { name: "Next round →" })).toBeDisabled();
  });

  it("advances through every round and shows the finished state with picks recorded", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByRole("button", { name: "Show all" }));
    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Silhouette")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("All rounds done")).toBeInTheDocument();
    expect(screen.getByText("You saved 2 picks, one per round.")).toBeInTheDocument();
    expect(screen.getByText("Saved so far")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText("Silhouette")).toBeInTheDocument();
  });

  it("uses sacrifice-framed copy for the sacrifice_one format", async () => {
    const sacrificePack: Pack = { ...SAVE_ONE_PACK, format: "sacrifice_one" };
    renderScreen(sacrificePack);

    expect(
      await screen.findByText("Pick the one you'd sacrifice. Check it below, then confirm."),
    ).toBeInTheDocument();
  });

  it("records the finished play and stores the picks for the result page", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByRole("button", { name: "Show all" }));
    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    await screen.findByText("All rounds done");
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { groupId: "g1", itemId: "2" },
        { groupId: "g2", itemId: "3" },
      ],
    });
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!)).toEqual([
        { groupId: "g1", itemId: "2" },
        { groupId: "g2", itemId: "3" },
      ]),
    );
    expect(screen.getByRole("link", { name: "See your result" })).toHaveAttribute(
      "href",
      "/packs/pack-a/result",
    );
  });

  it("does not persist picks for the result page when recording the play fails", async () => {
    vi.mocked(playsClient.record).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByRole("button", { name: "Show all" }));
    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    await screen.findByText("All rounds done");
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(sessionStorage.getItem("velanto:last-play:pack-a")).toBeNull();
  });
});
