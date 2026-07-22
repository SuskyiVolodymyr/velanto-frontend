import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  screen,
  waitFor,
  within,
  fireEvent,
  createEvent,
} from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { CreatePackForm } from "./CreatePackForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";
import {
  PACK_LANGUAGES,
  PACK_LANGUAGE_NAMES,
} from "@/src/shared/types/pack-language";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";

// This is a heavy component suite: the format-switch tests drive many sequential
// userEvent interactions each, and every keystroke re-renders the whole RHF
// form (useWatch subscribers + zod resolver). Give it headroom so the run is
// contention-proof rather than isolation-dependent.
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
    update: vi.fn(),
    getById: vi.fn(),
  },
}));

// A complete, valid set of edit-mode seed values (one pool with one item, a
// single elimination round drawing the whole pool).
const EDIT_VALUES = {
  title: "Original Title",
  description: "Original description",
  coverTone: "#2b2a3a",
  format: "save_one" as const,
  // Not "en": edit mode must seed the pack's OWN language, never re-derive it
  // from the editor's interface locale — otherwise viewing a Spanish pack in an
  // English UI would silently relabel it on save.
  language: "es" as const,
  tags: ["Anime" as const],
  groups: [
    {
      id: "g1",
      name: "2016",
      // Two items so the save_one round's manual draw meets the min-draw of 2.
      items: [
        { id: "i1", type: "text" as const, title: "AoT", value: "Guren" },
        { id: "i2", type: "text" as const, title: "Redo", value: "Redo" },
      ],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [
        { groupId: "g1", mode: "manual" as const, itemIds: ["i1", "i2"] },
      ],
    },
  ],
};

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
    language: "en",
    tags: [],
    groups: [],
    rounds: [],
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

function renderEditForm() {
  return render(
    <AuthProvider>
      <CreatePackForm mode="edit" packId="pack-1" initialValues={EDIT_VALUES} />
    </AuthProvider>,
  );
}

// Titles/descriptions are kept short on purpose: every keystroke re-renders the
// whole RHF form and re-runs the zod resolver, so long strings dominate this
// suite's runtime. The default pack has one pool + one elimination round
// (drawing 2); a single-item pool still passes (under-fill is only a soft hint).
async function fillMinimalValidPack(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Pack title"), "Best");
  await user.type(screen.getByLabelText("Pack description"), "Desc");
  await user.type(screen.getByLabelText("Pool 1 name"), "2016");
  await user.type(screen.getByLabelText("Pool 1 new item"), "A");
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

  it("rejects a pool with no items", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(await screen.findByLabelText("Pack title"), "Title");
    await user.type(screen.getByLabelText("Pack description"), "Desc");
    await user.type(screen.getByLabelText("Pool 1 name"), "Round 1");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText('Group "Round 1" needs at least one item.'),
    ).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  it("defaults to the Rounds editor (not Versus) for save_one", async () => {
    renderForm();
    await screen.findByLabelText("Pack title");

    expect(
      screen.getByRole("button", { name: "+ Add round" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Round 1 pool")).toBeInTheDocument();
    expect(screen.queryByLabelText("Side A")).not.toBeInTheDocument();
  });

  it("adds and removes pools, keeping each editor's live value", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    // Default: one pool, not removable.
    expect(screen.getByLabelText("Pool 1 name")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove pool 1" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Pool 1 name"), "Boys");
    await user.click(screen.getByRole("button", { name: "+ Add pool" }));

    await user.type(screen.getByLabelText("Pool 2 name"), "Girls");
    expect(screen.getByLabelText("Pool 1 name")).toHaveValue("Boys");
    expect(screen.getByLabelText("Pool 2 name")).toHaveValue("Girls");

    await user.click(screen.getByRole("button", { name: "Remove pool 2" }));

    expect(screen.queryByLabelText("Pool 2 name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pool 1 name")).toHaveValue("Boys");
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

  // #239: nothing could set Pack.language, so every pack was 'en' regardless of
  // its content — and the backend's language filter had nothing to filter on.
  it("offers every pack language, defaulting to the interface language", async () => {
    renderForm();

    const select = await screen.findByLabelText("Pack language");
    // Scoped to this select: the form has other selects (round pool, slot mode)
    // whose options a page-wide query would sweep up.
    const options = within(select).getAllByRole("option");

    // All 11 — es/fr/pt included, which is the point of PACK_LANGUAGES being a
    // superset of LOCALES: an English UI must still be able to label a pack
    // Spanish. Those three have no interface catalog, so this picker is the
    // ONLY place they can be reached.
    expect(options).toHaveLength(PACK_LANGUAGES.length);
    expect(options.map((o) => o.textContent)).toEqual(
      PACK_LANGUAGES.map((code) => PACK_LANGUAGE_NAMES[code]),
    );
    // The harness renders under locale="en".
    expect(select).toHaveValue("en");
  });

  it("defaults the language to the author's interface language, not English", async () => {
    // Rendered outside the shared helper on purpose: it pins locale="en", and
    // "defaults to en under an en UI" would pass even if the default were
    // hardcoded. A non-English UI is the only render that proves the wiring.
    render(
      <NextIntlClientProvider locale="uk" messages={ukMessages}>
        <AuthProvider>
          <CreatePackForm />
        </AuthProvider>
      </NextIntlClientProvider>,
    );

    expect(await screen.findByLabelText("Мова паку")).toHaveValue("uk");
  });

  // The failure this guards against is silent and destructive: open a Spanish
  // pack in an English UI, change the title, save — and the pack is now
  // labelled English. EDIT_VALUES is deliberately 'es' while the harness
  // renders under locale="en", so a default-from-locale bug fails here.
  it("keeps the pack's own language on edit rather than the editor's locale", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.update).mockResolvedValue(makePack({ id: "pack-1" }));
    renderEditForm();

    expect(await screen.findByLabelText("Pack language")).toHaveValue("es");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(packsClient.update).toHaveBeenCalled());
    expect(packsClient.update).toHaveBeenCalledWith(
      "pack-1",
      expect.objectContaining({ language: "es" }),
    );
  });

  it("saves as a draft (draft:true) when Save as draft is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue(makePack({ id: "pack-1" }));
    renderForm();
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true }),
    );
  });

  it("publishes the filled form (draft:false, chosen language, groups and rounds) and redirects to its detail page", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue(makePack({ id: "pack-1" }));
    renderForm();
    await fillMinimalValidPack(user);

    await user.selectOptions(screen.getByLabelText("Pack language"), "es");
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Best",
        description: "Desc",
        format: "save_one",
        language: "es",
        draft: false,
        groups: expect.arrayContaining([
          expect.objectContaining({ name: "2016" }),
        ]),
        rounds: expect.arrayContaining([
          expect.objectContaining({
            slots: [expect.objectContaining({ mode: "random", count: 2 })],
          }),
        ]),
      }),
    );
  });

  it("submits the chosen cover tone and selected tags in the payload", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue(makePack({ id: "pack-1" }));
    renderForm();
    await screen.findByLabelText("Pack title");

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

  describe("edit mode", () => {
    it("seeds the form from the pack and labels the submit button 'Save changes'", async () => {
      renderEditForm();

      expect(await screen.findByLabelText("Pack title")).toHaveValue(
        "Original Title",
      );
      expect(screen.getByLabelText("Pack description")).toHaveValue(
        "Original description",
      );
      expect(screen.getByLabelText("Pool 1 name")).toHaveValue("2016");
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Publish" }),
      ).not.toBeInTheDocument();
    });

    it("PATCHes the pack and redirects to its detail page on save", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.update).mockResolvedValue(
        makePack({ id: "pack-1" }),
      );
      renderEditForm();
      const title = await screen.findByLabelText("Pack title");
      await user.clear(title);
      await user.type(title, "New Title");

      await user.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1"));
      expect(packsClient.update).toHaveBeenCalledWith(
        "pack-1",
        expect.objectContaining({ title: "New Title", format: "save_one" }),
      );
      expect(packsClient.create).not.toHaveBeenCalled();
    });

    it("shows the server error and does not navigate when the edit fails", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.update).mockRejectedValue(
        new ApiError(403, "Forbidden", { message: "Not allowed" }),
      );
      renderEditForm();
      await screen.findByLabelText("Pack title");

      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByText("Not allowed")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("elimination formats keep the Rounds editor", () => {
    for (const [label, format] of [
      ["Sacrifice One", "sacrifice_one"],
      ["Rank Blind", "rank_blind"],
    ] as const) {
      it(`shows the Rounds editor (not Versus) when ${label} is selected`, async () => {
        const user = userEvent.setup();
        vi.mocked(packsClient.create).mockResolvedValue(
          makePack({ id: `pack-${format}`, format }),
        );
        renderForm();
        await user.click(
          await screen.findByRole("button", { name: new RegExp(`^${label}`) }),
        );

        expect(
          screen.getByRole("button", { name: "+ Add round" }),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText("Side A")).not.toBeInTheDocument();

        await fillMinimalValidPack(user);
        await user.click(screen.getByRole("button", { name: "Publish" }));

        await waitFor(() =>
          expect(push).toHaveBeenCalledWith(`/packs/pack-${format}`),
        );
        expect(packsClient.create).toHaveBeenCalledWith(
          expect.objectContaining({ format, rounds: expect.any(Array) }),
        );
      });
    }
  });

  describe("versus formats swap in the Versus editor", () => {
    it("switches from Rounds to the per-round Versus editor when NxN is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(await screen.findByRole("button", { name: /^NxN/ }));

      expect(screen.getByLabelText("Side A for round 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Side B for round 1")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Items per side for round 1"),
      ).toBeInTheDocument();
      // The per-round editor has its own add-round control.
      expect(
        screen.getByRole("button", { name: "+ Add round" }),
      ).toBeInTheDocument();
    });

    it("pins per-side to 1 (no input) when 1v1 is selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(await screen.findByRole("button", { name: /^1v1/ }));

      expect(screen.getByLabelText("Side A for round 1")).toBeInTheDocument();
      expect(screen.getByText("1 per side")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Items per side for round 1"),
      ).not.toBeInTheDocument();
    });

    it("submits a valid nxn pack with two pools and generated two-slot rounds", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({ id: "pack-nxn", format: "nxn" }),
      );
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "T");
      await user.type(screen.getByLabelText("Pack description"), "D");

      // Two distinct pools, each with one item, built before switching so the
      // format switch generates rounds over both.
      await user.type(screen.getByLabelText("Pool 1 name"), "Boys");
      await user.type(screen.getByLabelText("Pool 1 new item"), "Naruto");
      await user.click(screen.getAllByRole("button", { name: "Add" })[0]);
      await user.click(screen.getByRole("button", { name: "+ Add pool" }));
      await user.type(screen.getByLabelText("Pool 2 name"), "Girls");
      await user.type(screen.getByLabelText("Pool 2 new item"), "Sakura");
      await user.click(screen.getAllByRole("button", { name: "Add" })[1]);

      await user.click(screen.getByRole("button", { name: /^NxN/ }));

      // The versus editor seeds a single matchup, which keeps the 1-item pools
      // feasible (per-side 1, no dedup exhaustion).
      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-nxn"));
      const payload = vi.mocked(packsClient.create).mock.calls[0][0];
      expect(payload.format).toBe("nxn");
      expect(payload.groups.map((g) => g.name)).toEqual(["Boys", "Girls"]);
      expect(payload.rounds).toHaveLength(1);
      expect(payload.rounds[0].slots).toHaveLength(2);
      expect(payload.rounds[0].slots.every((s) => s.count === 1)).toBe(true);
    });

    it("submits a valid 1v1 pack with two-slot single-per-side rounds", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.create).mockResolvedValue(
        makePack({ id: "pack-1v1", format: "1v1" }),
      );
      renderForm();
      await user.type(await screen.findByLabelText("Pack title"), "T");
      await user.type(screen.getByLabelText("Pack description"), "D");

      await user.type(screen.getByLabelText("Pool 1 name"), "Left");
      await user.type(screen.getByLabelText("Pool 1 new item"), "A");
      await user.click(screen.getAllByRole("button", { name: "Add" })[0]);
      await user.click(screen.getByRole("button", { name: "+ Add pool" }));
      await user.type(screen.getByLabelText("Pool 2 name"), "Right");
      await user.type(screen.getByLabelText("Pool 2 new item"), "B");
      await user.click(screen.getAllByRole("button", { name: "Add" })[1]);

      await user.click(screen.getByRole("button", { name: /^1v1/ }));

      // The versus editor seeds a single matchup — feasible for the 1-item pools.
      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-1v1"));
      const payload = vi.mocked(packsClient.create).mock.calls[0][0];
      expect(payload.format).toBe("1v1");
      expect(payload.rounds[0].slots).toHaveLength(2);
      expect(payload.rounds[0].slots.every((s) => s.count === 1)).toBe(true);
    });
  });

  // #361: the form's submit handler publishes / submits for review, and a
  // browser's implicit submission fires it from any single-line field — so
  // editing a draft's title and pressing Enter out of habit sent it to
  // moderation.
  //
  // jsdom does NOT implement implicit submission, so this can't be asserted by
  // "did the API get called" — that passes against the bug. What IS observable
  // here is the keydown being cancelled, which is exactly what stops a browser
  // submitting. The real end-to-end behaviour is covered in e2e/create-pack.
  it("cancels Enter in a text field, so a browser cannot implicitly submit", async () => {
    renderForm();
    const title = await screen.findByLabelText("Pack title");

    const event = createEvent.keyDown(title, { key: "Enter" });
    fireEvent(title, event);

    expect(event.defaultPrevented).toBe(true);
  });

  // A textarea's Enter is a newline, not a submit — leave it alone.
  it("leaves Enter alone in a textarea", async () => {
    renderForm();
    await screen.findByLabelText("Pack title");
    const description = screen.getByLabelText("Pack description");

    const event = createEvent.keyDown(description, { key: "Enter" });
    fireEvent(description, event);

    expect(event.defaultPrevented).toBe(false);
  });

  // Enter there adds the item; the add must still happen.
  it("still adds a pool item on Enter", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.type(screen.getByLabelText("Pool 1 new item"), "Naruto{Enter}");

    expect(screen.getByText("Naruto")).toBeInTheDocument();
    expect(packsClient.create).not.toHaveBeenCalled();
  });

  // The buttons are the deliberate action and keep working.
  it("still submits from the Publish button", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("Pack title");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Give your pack a title."),
    ).toBeInTheDocument();
  });
});
