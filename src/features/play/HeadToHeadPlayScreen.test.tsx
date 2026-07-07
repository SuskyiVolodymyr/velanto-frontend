import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeadToHeadPlayScreen } from "./HeadToHeadPlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/packs/pack-1v1/play",
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

const HEAD_TO_HEAD_PACK: Pack = {
  id: "pack-1v1",
  title: "Anime Face-Offs",
  description: "Pick a winner each round.",
  coverTone: "#2b2a3a",
  format: "1v1",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "Round 1",
      selectionMode: "manual",
      items: [textItem("i1", "Goku"), textItem("i2", "Vegeta")],
    },
    {
      id: "g2",
      name: "Round 2",
      selectionMode: "manual",
      items: [textItem("i3", "Naruto"), textItem("i4", "Sasuke")],
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
      <HeadToHeadPlayScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "t", user: MOCK_USER });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("HeadToHeadPlayScreen", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new ApiError(401, "Unauthorized", null));
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);

    expect(await screen.findByText("You need to be logged in to play a pack.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fpacks%2Fpack-1v1%2Fplay");
  });

  it("shows both items of the first matchup immediately", async () => {
    renderScreen(HEAD_TO_HEAD_PACK);

    expect(await screen.findByText("Goku")).toBeInTheDocument();
    expect(screen.getByText("Vegeta")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
  });

  it("advances to the next matchup immediately after picking a winner", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");

    await user.click(screen.getByRole("button", { name: "Pick Goku" }));

    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    expect(screen.getByText("Sasuke")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
  });

  it("shows the finished state with matchup history after the last pick, and records the play once", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");
    await user.click(screen.getByRole("button", { name: "Pick Goku" }));
    await screen.findByText("Naruto");
    await user.click(screen.getByRole("button", { name: "Pick Sasuke" }));

    expect(await screen.findByText(/All matchups done/i)).toBeInTheDocument();
    expect(screen.getByText("Goku")).toBeInTheDocument();
    expect(screen.getByText(/beat/i)).toBeInTheDocument();
    expect(screen.getByText("Vegeta")).toBeInTheDocument();
    expect(screen.getByText("Sasuke")).toBeInTheDocument();
    expect(screen.getByText("Naruto")).toBeInTheDocument();

    await waitFor(() =>
      expect(playsClient.record).toHaveBeenCalledWith("pack-1v1", {
        picks: [
          { groupId: "g1", itemId: "i1" },
          { groupId: "g2", itemId: "i4" },
        ],
      }),
    );
    expect(playsClient.record).toHaveBeenCalledTimes(1);
  });
});
