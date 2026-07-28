import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { CreatePreviewPanel } from "./CreatePreviewPanel";
import type { CreatePackValues } from "./create-pack.schema";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

// One empty pool, one default elimination round — mirrors CreatePackForm's
// fresh-draft seed but with title/description left blank so canPublish is
// false (the empty-state / blocked-CTA fixture).
const EMPTY_VALUES: CreatePackValues = {
  title: "",
  description: "",
  coverTone: "#2b2a3a",
  format: "save_one",
  language: "en",
  tags: [],
  groups: [{ id: "g1", name: "Pool", items: [] }],
  rounds: [
    {
      id: "r1",
      name: "",
      slots: [{ groupId: "g1", mode: "random", count: 2 }],
    },
  ],
};

// Two pools (3 elements total), two rounds, title+description filled — the
// canPublish:true / populated-summary fixture.
const SEEDED_VALUES: CreatePackValues = {
  title: "Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#20303a",
  format: "save_one",
  language: "en",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        { id: "i1", type: "text", title: "A", value: "A" },
        { id: "i2", type: "text", title: "B", value: "B" },
      ],
    },
    {
      id: "g2",
      name: "2017",
      items: [{ id: "i3", type: "text", title: "C", value: "C" }],
    },
  ],
  rounds: [
    {
      id: "r1",
      name: "",
      slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1", "i2"] }],
    },
    {
      id: "r2",
      name: "",
      slots: [{ groupId: "g2", mode: "manual", itemIds: ["i3"] }],
    },
  ],
};

function Harness({
  defaultValues,
  mode = "create",
  coverUploading = false,
}: {
  defaultValues: CreatePackValues;
  mode?: "create" | "edit";
  coverUploading?: boolean;
}) {
  const methods = useForm<CreatePackValues>({ defaultValues });
  return (
    <FormProvider {...methods}>
      <CreatePreviewPanel
        mode={mode}
        coverUploading={coverUploading}
        submitMode="publish"
        onPublishClick={() => {}}
      />
    </FormProvider>
  );
}

function renderPanel(
  defaultValues: CreatePackValues,
  mode?: "create" | "edit",
  coverUploading?: boolean,
) {
  return render(
    <AuthProvider>
      <Harness
        defaultValues={defaultValues}
        mode={mode}
        coverUploading={coverUploading}
      />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
});

describe("CreatePreviewPanel", () => {
  it("falls back to the untitled/no-description empty states when title and description are blank", async () => {
    renderPanel(EMPTY_VALUES);

    expect(await screen.findByText("Untitled pack")).toBeInTheDocument();
    expect(screen.getByText("Add a short description…")).toBeInTheDocument();
  });

  it("shows the real title and description once they're filled", async () => {
    renderPanel(SEEDED_VALUES);

    expect(await screen.findByText("Anime Openings")).toBeInTheDocument();
    expect(
      screen.getByText("Pick your favorite each round."),
    ).toBeInTheDocument();
  });

  it("reflects the seeded form's pool/element/round counts in the summary panel", async () => {
    renderPanel(SEEDED_VALUES);

    await screen.findByText("Anime Openings");
    // Pools: 2, Elements: 3 (2 + 1), Rounds: 2.
    expect(screen.getByText("Pools").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Elements").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Rounds").nextSibling).toHaveTextContent("2");
  });

  it("shows the blocked Publish CTA with aria-disabled when canPublish is false", async () => {
    renderPanel(EMPTY_VALUES);

    const cta = await screen.findByRole("button", {
      name: "Add a title & elements",
    });
    expect(cta).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the ready Publish CTA (no aria-disabled) when canPublish is true", async () => {
    renderPanel(SEEDED_VALUES);

    const cta = await screen.findByRole("button", { name: "Publish pack" });
    expect(cta).not.toHaveAttribute("aria-disabled", "true");
  });

  it("natively disables the ready Publish CTA while the cover image is uploading", async () => {
    renderPanel(SEEDED_VALUES, "create", true);

    const cta = await screen.findByRole("button", { name: "Publish pack" });
    expect(cta).toBeDisabled();
  });

  it("shows the existing Save changes label instead of the publish CTA in edit mode", async () => {
    renderPanel(SEEDED_VALUES, "edit");

    expect(
      await screen.findByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish pack" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a title & elements" }),
    ).not.toBeInTheDocument();
  });
});
