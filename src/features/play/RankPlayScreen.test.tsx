import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankPlayScreen } from "./RankPlayScreen";
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

const RANK_BLIND_PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  format: "rank_blind",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "Openers",
      selectionMode: "manual",
      items: [textItem("i1", "Kaikai Kitan"), textItem("i2", "Redo")],
    },
    {
      id: "g2",
      name: "Closers",
      selectionMode: "manual",
      items: [textItem("i3", "Silhouette")],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
};

function renderScreen(pack: Pack) {
  return render(
    <AuthProvider>
      <RankPlayScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "t", user: MOCK_USER });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("RankPlayScreen", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new ApiError(401, "Unauthorized", null));
    renderScreen(RANK_BLIND_PACK);

    expect(await screen.findByText("You need to be logged in to play a pack.")).toBeInTheDocument();
  });

  it("shows the first item and one empty numbered slot per item in a manual-mode round", async () => {
    renderScreen(RANK_BLIND_PACK);

    expect(await screen.findByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });

  it("places the current item into the slot the player clicks, out of numeric order", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    // Place the first item ("Kaikai Kitan") into slot #2, not #1.
    await user.click(screen.getByText("#2"));

    expect(screen.getByText("Redo")).toBeInTheDocument(); // now showing the 2nd item
    const slot2 = screen.getByText("#2").closest("button")!;
    expect(slot2).toHaveTextContent("Kaikai Kitan");
  });

  it("shows a round-complete summary and advances to the next round", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));

    expect(await screen.findByText("Openers ranked")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Silhouette")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
  });

  it("records the accumulated picks once, after the last round, then shows the finished state", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(await screen.findByRole("button", { name: "Next round →" }));

    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    expect(await screen.findByText("Your ranking is done")).toBeInTheDocument();
    expect(playsClient.record).toHaveBeenCalledTimes(1);
    expect(playsClient.record).toHaveBeenCalledWith("pack-rank", {
      picks: [
        { groupId: "g1", itemId: "i1", position: 0 },
        { groupId: "g1", itemId: "i2", position: 1 },
        { groupId: "g2", itemId: "i3", position: 0 },
      ],
    });
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem("velanto:last-play:pack-rank")!)).toEqual([
        { groupId: "g1", itemId: "i1", position: 0 },
        { groupId: "g1", itemId: "i2", position: 1 },
        { groupId: "g2", itemId: "i3", position: 0 },
      ]),
    );
    expect(screen.getByRole("link", { name: "See your result" })).toHaveAttribute(
      "href",
      "/packs/pack-rank/result",
    );
  });

  it("sizes a random-mode round's slots to sampleSize, not the full item count", async () => {
    const randomPack: Pack = {
      ...RANK_BLIND_PACK,
      groups: [
        {
          id: "g1",
          name: "Closers",
          selectionMode: "random",
          sampleSize: 2,
          items: [textItem("i1", "A"), textItem("i2", "B"), textItem("i3", "C")],
        },
      ],
    };
    renderScreen(randomPack);

    await screen.findByText("Round 1 of 1");
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });
});
