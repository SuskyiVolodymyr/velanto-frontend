import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { CreatePackForm } from "./CreatePackForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

// This is a heavy component suite: the nxn/format tests drive ~10 sequential
// userEvent interactions each, and every keystroke re-renders the whole RHF
// form (useWatch subscribers + zod resolver). Under the full parallel suite
// that occasionally brushes past Vitest's default 5s per-test timeout even
// though each test finishes in well under 2s in isolation. Give this file more
// headroom so the run is contention-proof rather than isolation-dependent.
vi.setConfig({ testTimeout: 20000 });

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/create",
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
  packsClient: {
    create: vi.fn(),
    getById: vi.fn(),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

// Minimal Pack the create mock resolves with — only `id` drives the redirect,
// the rest satisfies the type.
function makePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "pack-1",
    title: "Best Anime Openings",
    description: "Pick your favorite each round.",
    coverTone: "#2b2a3a",
    format: "save_one",
    tags: [],
    groups: [],
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
    ...overrides,
  };
}

function renderForm() {
  return render(
    <AuthProvider>
      <CreatePackForm />
    </AuthProvider>,
  );
}

// Titles/descriptions are kept short on purpose: every keystroke re-renders the
// whole RHF form and re-runs the zod resolver, so long strings dominate this
// suite's runtime. The schema only requires min length 1, and no test asserts
// these exact values, so a few characters cover the same behaviour far faster.
async function fillMinimalValidPack(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Pack title"), "Best");
  await user.type(screen.getByLabelText("Pack description"), "Desc");
  await user.type(screen.getByLabelText("Group 1 name"), "2016");
  await user.type(screen.getByLabelText("Group 1 new item"), "A");
  await user.click(screen.getByRole("button", { name: "Add" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
});

describe("CreatePackForm", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    const user = userEvent.setup();
    renderForm();

    expect(
      await screen.findByText("You need to be logged in to create a pack."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pack title")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fcreate");
  });

  it("rejects an empty submission without calling the API", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Give your pack a title."),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("rejects a group with no items", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(await screen.findByLabelText("Pack title"), "Title");
    await user.type(screen.getByLabelText("Pack description"), "Desc");
    await user.type(screen.getByLabelText("Group 1 name"), "Round 1");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText('Group "Round 1" needs at least one item.'),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("rejects a random-selection group with no sample size", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillMinimalValidPack(user);
    await user.click(screen.getByRole("button", { name: "Random" }));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText('Group "2016" needs a sample size.'),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("rejects a sample size larger than the group's item count", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillMinimalValidPack(user);
    await user.click(screen.getByRole("button", { name: "Random" }));
    await user.type(screen.getByLabelText("Group 1 sample size"), "5");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText(
        "Group \"2016\"'s sample size can't exceed its 1 item(s).",
      ),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("adds and removes group rounds, keeping each editor's live value", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    // Default: one group, not removable.
    expect(screen.getByLabelText("Group 1 name")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove group 1" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Group 1 name"), "Round 1");
    await user.click(
      screen.getByRole("button", { name: "+ Add group (one more round)" }),
    );

    // Second editor appears; both are now removable and hold independent values.
    await user.type(screen.getByLabelText("Group 2 name"), "Round 2");
    expect(screen.getByLabelText("Group 1 name")).toHaveValue("Round 1");
    expect(screen.getByLabelText("Group 2 name")).toHaveValue("Round 2");

    await user.click(screen.getByRole("button", { name: "Remove group 2" }));

    expect(screen.queryByLabelText("Group 2 name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Group 1 name")).toHaveValue("Round 1");
  });

  it("opens the tag picker modal and reflects the selected count on the button", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.click(screen.getByRole("button", { name: "Select tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(
      screen.getByRole("button", { name: "2 tags selected" }),
    ).toBeInTheDocument();
  });

  it("passes maxTags through to the tag picker so the cap disables further boxes", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.click(screen.getByRole("button", { name: "Select tags" }));
    const tagsToSelect = [
      "Anime",
      "Movies",
      "Music",
      "Sports",
      "Football",
      "Basketball",
      "Wrestling",
      "Food",
      "Gaming",
      "Board Games",
    ];
    for (const tag of tagsToSelect) {
      await user.click(screen.getByRole("checkbox", { name: tag }));
    }

    // The cap applies to the in-progress draft while the modal is still open.
    const eleventh = screen.getByRole("checkbox", { name: "Comics" });
    expect(eleventh).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("button", { name: "10 tags selected" }),
    ).toBeInTheDocument();
  });

  it("submits a valid pack and redirects to its detail page", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue(makePack({ id: "pack-1" }));
    renderForm();
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Best",
        description: "Desc",
        format: "save_one",
      }),
    );
  });

  it("submits the chosen cover tone and selected tags in the payload", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue(makePack({ id: "pack-1" }));
    renderForm();
    await screen.findByLabelText("Pack title");

    // Default cover tone is COVER_TONES[0]; pick a different one and confirm it
    // becomes the pressed swatch.
    const tone = screen.getByRole("button", { name: "Cover tone #20303a" });
    await user.click(tone);
    expect(tone).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Select tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await fillMinimalValidPack(user);
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        coverTone: "#20303a",
        tags: ["Anime", "Music"],
      }),
    );
  });

  it("shows the server error and does not navigate when create fails", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockRejectedValue(
      new ApiError(403, "Forbidden", { message: "Not allowed" }),
    );
    renderForm();
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Not allowed")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("surfaces the backend's blocked-term rejection inline and does not navigate", async () => {
    const user = userEvent.setup();
    // The real nestjs-zod validation 400: generic top-level `message`, with the
    // field-level moderation rejection under `errors[]` at the offending path.
    // The input itself is innocuous — the block is decided entirely server-side.
    vi.mocked(packsClient.create).mockRejectedValue(
      new ApiError(400, "Bad Request", {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "custom",
            path: ["description"],
            message:
              "This text contains language that isn't allowed on Velanto.",
          },
        ],
      }),
    );
    renderForm();
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText(
        "This text contains language that isn't allowed on Velanto.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  describe("sacrifice_one format", () => {
    it("shows the Groups section (not Categories) when Sacrifice One is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(
        await screen.findByRole("button", { name: /^Sacrifice One/ }),
      );

      expect(
        screen.getByRole("button", { name: "+ Add group (one more round)" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Category 1 name"),
      ).not.toBeInTheDocument();
    });

    it("submits a valid sacrifice_one pack with the same groups payload shape as save_one", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({ id: "pack-sac", format: "sacrifice_one" }),
      );
      renderForm();
      await user.click(
        await screen.findByRole("button", { name: /^Sacrifice One/ }),
      );
      await fillMinimalValidPack(user);

      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-sac"));
      expect(packsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "sacrifice_one",
          groups: expect.arrayContaining([
            expect.objectContaining({ name: "2016" }),
          ]),
        }),
      );
      expect(packsClient.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ categories: expect.anything() }),
      );
    });
  });

  describe("nxn format", () => {
    async function switchToNxn(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: /^NxN/ }));
    }

    it("switches from Groups to Categories when NxN is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToNxn(user);

      expect(screen.getByLabelText("Category 1 name")).toBeInTheDocument();
      expect(screen.getByLabelText("Category 2 name")).toBeInTheDocument();
      expect(screen.queryByLabelText("Group 1 name")).not.toBeInTheDocument();
    });

    it("rejects an nxn submission with a category that has no items", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "T");
      await user.type(screen.getByLabelText("Pack description"), "D");
      await switchToNxn(user);
      await user.type(screen.getByLabelText("Category 1 name"), "Boys");
      await user.type(screen.getByLabelText("Category 2 name"), "Girls");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      expect(
        await screen.findByText('Category "Boys" needs at least one item.'),
      ).toBeInTheDocument();
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("rejects an nxn submission when versusN exceeds a category's item count", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "T");
      await user.type(screen.getByLabelText("Pack description"), "D");
      await switchToNxn(user);
      await user.type(screen.getByLabelText("Category 1 name"), "Boys");
      await user.type(screen.getByLabelText("Category 1 new item"), "Naruto");
      await user.click(screen.getAllByRole("button", { name: "Add" })[0]);
      await user.type(screen.getByLabelText("Category 2 name"), "Girls");
      await user.type(screen.getByLabelText("Category 2 new item"), "Sakura");
      await user.click(screen.getAllByRole("button", { name: "Add" })[1]);
      await user.type(screen.getByLabelText("Rounds"), "8");
      await user.type(screen.getByLabelText("Items per round"), "5");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      expect(
        await screen.findByText('Category "Boys" needs at least 5 item(s).'),
      ).toBeInTheDocument();
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("submits a valid nxn pack with categories/versusRounds/versusN and no groups", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({
          id: "pack-nxn",
          format: "nxn",
          categories: [],
          versusRounds: 8,
          versusN: 1,
          groups: undefined,
        }),
      );
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "T");
      await user.type(screen.getByLabelText("Pack description"), "D");
      await switchToNxn(user);
      await user.type(screen.getByLabelText("Category 1 name"), "Boys");
      await user.type(screen.getByLabelText("Category 1 new item"), "Naruto");
      await user.click(screen.getAllByRole("button", { name: "Add" })[0]);
      await user.type(screen.getByLabelText("Category 2 name"), "Girls");
      await user.type(screen.getByLabelText("Category 2 new item"), "Sakura");
      await user.click(screen.getAllByRole("button", { name: "Add" })[1]);
      await user.type(screen.getByLabelText("Rounds"), "8");
      await user.type(screen.getByLabelText("Items per round"), "1");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-nxn"));
      expect(packsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "nxn",
          versusRounds: 8,
          versusN: 1,
          categories: [
            expect.objectContaining({
              name: "Boys",
              items: [expect.objectContaining({ title: "Naruto" })],
            }),
            expect.objectContaining({
              name: "Girls",
              items: [expect.objectContaining({ title: "Sakura" })],
            }),
          ],
        }),
      );
      expect(vi.mocked(packsClient.create).mock.calls[0][0]).not.toHaveProperty(
        "groups",
      );
    });
  });

  describe("rank_blind format", () => {
    it("shows the Groups section (not Categories) when Rank Blind is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(
        await screen.findByRole("button", { name: /^Rank Blind/ }),
      );

      expect(
        screen.getByRole("button", { name: "+ Add group (one more round)" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Category 1 name"),
      ).not.toBeInTheDocument();
    });

    it("submits a valid rank_blind pack with the same groups payload shape as save_one", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({ id: "pack-rank", format: "rank_blind" }),
      );
      renderForm();
      await user.click(
        await screen.findByRole("button", { name: /^Rank Blind/ }),
      );
      await fillMinimalValidPack(user);

      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() =>
        expect(push).toHaveBeenCalledWith("/packs/pack-rank"),
      );
      expect(packsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "rank_blind",
          groups: expect.arrayContaining([
            expect.objectContaining({ name: "2016" }),
          ]),
        }),
      );
      expect(packsClient.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ categories: expect.anything() }),
      );
    });
  });

  describe("1v1 format", () => {
    it("shows the Groups section (not Categories) when 1v1 is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(await screen.findByRole("button", { name: /^1v1/ }));

      expect(
        screen.getByRole("button", { name: "+ Add group (one more round)" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Category 1 name"),
      ).not.toBeInTheDocument();
    });

    it("rejects a 1v1 group with only one item and does not call the API", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(await screen.findByRole("button", { name: /^1v1/ }));
      await fillMinimalValidPack(user);

      await user.click(screen.getByRole("button", { name: "Publish" }));

      expect(
        await screen.findByText(
          'Group "2016" needs exactly 2 items for a 1v1 matchup.',
        ),
      ).toBeInTheDocument();
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("submits a valid 1v1 pack with the same groups payload shape as save_one", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({ id: "pack-1v1", format: "1v1" }),
      );
      renderForm();
      await user.click(await screen.findByRole("button", { name: /^1v1/ }));
      await fillMinimalValidPack(user);
      // fillMinimalValidPack adds exactly one item to the default group —
      // 1v1 needs exactly 2, so add a second one before publishing (same
      // "Group 1 new item" input + "Add" button fillMinimalValidPack itself
      // used, see GroupEditor.tsx).
      await user.type(screen.getByLabelText("Group 1 new item"), "Second item");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1v1"));
      expect(packsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "1v1",
          groups: expect.arrayContaining([
            expect.objectContaining({ name: "2016" }),
          ]),
        }),
      );
      expect(packsClient.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ categories: expect.anything() }),
      );
    });
  });
});
