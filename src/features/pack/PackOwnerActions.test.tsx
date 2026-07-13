import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { PackOwnerActions } from "@/src/features/pack/PackOwnerActions";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Role } from "@/src/shared/types/user";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
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
  packsClient: { delete: vi.fn() },
}));

function mockSession(id: string, role: Role) {
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

function renderActions(packAuthorId = "u1") {
  return render(
    <AuthProvider>
      <PackOwnerActions packId="pack-1" packAuthorId={packAuthorId} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PackOwnerActions", () => {
  it("shows both Edit and Delete to the pack's author", async () => {
    mockSession("u1", "user");
    renderActions("u1");

    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/packs/pack-1/edit",
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows Delete but not Edit to a staff member who is not the author", async () => {
    mockSession("mod-1", "moderator");
    renderActions("u1");

    expect(
      await screen.findByRole("button", { name: "Delete" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing for a plain user who is neither author nor staff", async () => {
    mockSession("stranger", "user");
    const { container } = renderActions("u1");

    // Give the async auth resolution a tick, then assert no actions rendered.
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signed out", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderActions("u1");

    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("deletes the pack after confirmation and redirects home", async () => {
    const user = userEvent.setup();
    mockSession("u1", "user");
    vi.mocked(packsClient.delete).mockResolvedValue({ deleted: true });
    renderActions("u1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    // Confirm dialog appears.
    expect(
      await screen.findByRole("heading", { name: "Delete this pack?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete pack" }));

    await waitFor(() =>
      expect(packsClient.delete).toHaveBeenCalledWith("pack-1"),
    );
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a 'Deleting…' in-flight label on the confirm button", async () => {
    const user = userEvent.setup();
    mockSession("u1", "user");
    let resolveDelete: (v: { deleted: true }) => void = () => {};
    vi.mocked(packsClient.delete).mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    renderActions("u1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(
      await screen.findByRole("button", { name: "Delete pack" }),
    );

    // While the request is in flight the confirm button reads "Deleting…".
    const deleting = await screen.findByRole("button", { name: "Deleting…" });
    expect(deleting).toBeDisabled();

    resolveDelete({ deleted: true });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("keeps the dialog open and shows an error when deletion fails", async () => {
    const user = userEvent.setup();
    mockSession("u1", "user");
    vi.mocked(packsClient.delete).mockRejectedValue(
      new ApiError(500, "Server Error", null),
    );
    renderActions("u1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(
      await screen.findByRole("button", { name: "Delete pack" }),
    );

    expect(
      await screen.findByText("Couldn't delete the pack. Try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("closes the dialog with Cancel without deleting", async () => {
    const user = userEvent.setup();
    mockSession("u1", "user");
    renderActions("u1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Delete this pack?" }),
      ).not.toBeInTheDocument(),
    );
    expect(packsClient.delete).not.toHaveBeenCalled();
  });
});
