import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackOwnerStatusBadge } from "@/src/features/pack/PackOwnerStatusBadge";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import type { Role } from "@/src/shared/types/user";
import type { PackStatus } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

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

function mockSignedOut() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
}

function renderBadge(status: PackStatus, packAuthorId = "u1") {
  return render(
    <AuthProvider>
      <PackOwnerStatusBadge packAuthorId={packAuthorId} status={status} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PackOwnerStatusBadge", () => {
  it("shows a Draft badge to the pack's author", async () => {
    mockSession("u1");
    renderBadge("draft");
    expect(await screen.findByText("Draft")).toBeInTheDocument();
  });

  it("shows a Pending badge to the pack's author", async () => {
    mockSession("u1");
    renderBadge("pending");
    expect(await screen.findByText("Pending review")).toBeInTheDocument();
  });

  it("renders nothing for an approved pack (no badge needed once public)", async () => {
    mockSession("u1");
    const { container } = renderBadge("approved");
    // Give AuthProvider a tick to resolve the session before asserting emptiness.
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a viewer who is not the author", async () => {
    mockSession("someone-else");
    const { container } = renderBadge("pending", "u1");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a signed-out visitor", async () => {
    mockSignedOut();
    const { container } = renderBadge("pending");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
