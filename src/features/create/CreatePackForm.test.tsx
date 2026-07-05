import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePackForm, validate } from "./CreatePackForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";

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

function renderForm() {
  return render(
    <AuthProvider>
      <CreatePackForm />
    </AuthProvider>,
  );
}

async function fillMinimalValidPack(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Pack title"), "Best Anime Openings");
  await user.type(screen.getByLabelText("Pack description"), "Pick your favorite each round.");
  await user.type(screen.getByLabelText("Group 1 name"), "2016");
  await user.type(screen.getByLabelText("Group 1 new item"), "Guren no Yumiya");
  await user.click(screen.getByRole("button", { name: "Add" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "t", user: MOCK_USER });
});

describe("CreatePackForm", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new ApiError(401, "Unauthorized", null));
    renderForm();

    expect(await screen.findByText("You need to be logged in to create a pack.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Pack title")).not.toBeInTheDocument();
  });

  it("rejects an empty submission without calling the API", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByText("Give your pack a title.")).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("rejects a group with no items", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(await screen.findByLabelText("Pack title"), "Title");
    await user.type(screen.getByLabelText("Pack description"), "Desc");
    await user.type(screen.getByLabelText("Group 1 name"), "Round 1");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByText('Group "Round 1" needs at least one item.')).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("rejects a random-selection group with no sample size", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillMinimalValidPack(user);
    await user.click(screen.getByRole("button", { name: "Random" }));

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByText('Group "2016" needs a sample size.')).toBeInTheDocument();
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
      screen.getByText('Group "2016"\'s sample size can\'t exceed its 1 item(s).'),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("caps tag selection at 10 and dims the rest", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    const tagButtons = [
      "Anime", "Movies", "Music", "Sports", "Football",
      "Food", "Gaming", "Comics", "Sci-Fi", "TV",
    ];
    for (const tag of tagButtons) {
      await user.click(screen.getByRole("button", { name: tag }));
    }

    expect(screen.getByText("10/10")).toBeInTheDocument();
    const eleventh = screen.getByRole("button", { name: "Books" });
    expect(eleventh).toBeDisabled();
  });

  it("submits a valid pack and redirects to its detail page", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue({
      id: "pack-1",
      title: "Best Anime Openings",
      description: "Pick your favorite each round.",
      coverTone: "#2b2a3a",
      format: "save_one",
      tags: [],
      groups: [],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    renderForm();
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Best Anime Openings",
        description: "Pick your favorite each round.",
        format: "save_one",
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

  describe("nxn format", () => {
    async function switchToNxn(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: /^NxN/ }));
    }

    it("rejects an nxn submission with a category count other than 2", () => {
      const category = (name: string) => ({
        id: name,
        name,
        items: [{ id: "i1", type: "text" as const, title: "x", value: "x" }],
      });
      const fields = {
        title: "Boys vs Girls",
        description: "Pick a side.",
        tags: [],
        format: "nxn" as const,
        groups: [],
        categories: [category("Boys"), category("Girls"), category("Extra")],
        versusRounds: 8,
        versusN: 1,
      };

      expect(validate(fields)).toBe("NxN packs need exactly 2 categories.");
    });

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
      await user.type(await screen.findByLabelText("Pack title"), "Boys vs Girls");
      await user.type(screen.getByLabelText("Pack description"), "Pick a side.");
      await switchToNxn(user);
      await user.type(screen.getByLabelText("Category 1 name"), "Boys");
      await user.type(screen.getByLabelText("Category 2 name"), "Girls");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      expect(screen.getByText('Category "Boys" needs at least one item.')).toBeInTheDocument();
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("rejects an nxn submission when versusN exceeds a category's item count", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "Boys vs Girls");
      await user.type(screen.getByLabelText("Pack description"), "Pick a side.");
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
        screen.getByText('Category "Boys" needs at least 5 item(s).'),
      ).toBeInTheDocument();
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("submits a valid nxn pack with categories/versusRounds/versusN and no groups", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue({
        id: "pack-nxn",
        title: "Boys vs Girls",
        description: "Pick a side.",
        coverTone: "#2b2a3a",
        format: "nxn",
        tags: [],
        categories: [],
        versusRounds: 8,
        versusN: 1,
        authorId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "Boys vs Girls");
      await user.type(screen.getByLabelText("Pack description"), "Pick a side.");
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
      expect(vi.mocked(packsClient.create).mock.calls[0][0]).not.toHaveProperty("groups");
    });
  });
});
