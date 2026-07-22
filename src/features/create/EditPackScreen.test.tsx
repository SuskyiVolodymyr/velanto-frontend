import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { EditPackScreen } from "@/src/features/create/EditPackScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import type { Pack } from "@/src/shared/types/pack";
import type { Role } from "@/src/shared/types/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/packs/pack-1/edit",
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { create: vi.fn(), update: vi.fn() },
}));

const PACK: Pack = {
  id: "pack-1",
  title: "Original Title",
  description: "Original description",
  coverTone: "#2b2a3a",
  language: "en",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        { id: "i1", type: "text", title: "AoT", value: "Guren" },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

function mockSession(id: string, role: Role = "user") {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: {
      id,
      email: "a@example.com",
      username: "alice",
      role,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function renderScreen(pack: Pack = PACK) {
  return render(
    <AuthProvider>
      <EditPackScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditPackScreen", () => {
  it("renders the form seeded from the pack for its author", async () => {
    mockSession("u1");
    renderScreen();

    expect(await screen.findByLabelText("Pack title")).toHaveValue(
      "Original Title",
    );
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("blocks a signed-in user who is not the author", async () => {
    mockSession("someone-else");
    renderScreen();

    expect(
      await screen.findByText("You can only edit your own packs."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pack title")).not.toBeInTheDocument();
  });

  it("does not block a moderator who is not the author beyond the backend (edit is author-only, so still blocked)", async () => {
    mockSession("mod-1", "moderator");
    renderScreen();

    expect(
      await screen.findByText("You can only edit your own packs."),
    ).toBeInTheDocument();
  });

  it("shows the create-form login gate when signed out", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
    renderScreen();

    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(screen.queryByLabelText("Pack title")).not.toBeInTheDocument();
    expect(
      screen.queryByText("You can only edit your own packs."),
    ).not.toBeInTheDocument();
  });

  // UI-EXCLUDED:save_one_friends (velanto-frontend#368). The author owns the
  // pack, so none of the gates above fire — without an explicit branch they got
  // the real form with the format picker showing nothing selected, and Save
  // failed schema validation with no visibly failing control. Such a pack can
  // exist already: packs are authored over the API, not only through this form.
  it("tells the author the format is unsupported instead of rendering a form that cannot save", async () => {
    mockSession("u1");
    renderScreen({ ...PACK, format: "save_one_friends" });

    expect(
      await screen.findByText(
        "This pack uses a format the editor doesn't support yet, so it can't be edited here.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pack title")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
  });
});
