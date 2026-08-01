import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackRejectionReason } from "@/src/features/pack/PackRejectionReason";
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

function renderReason(
  status: PackStatus,
  rejectionReason: string | null,
  packAuthorId = "u1",
) {
  return render(
    <AuthProvider>
      <PackRejectionReason
        packAuthorId={packAuthorId}
        status={status}
        rejectionReason={rejectionReason}
      />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PackRejectionReason", () => {
  it("shows the reason to the pack's author when the pack was rejected", async () => {
    mockSession("u1");
    renderReason("rejected", "The cover image violates the content policy.");
    expect(
      await screen.findByText("The cover image violates the content policy."),
    ).toBeInTheDocument();
  });

  it("renders nothing when the pack isn't rejected, even with a stale reason present", async () => {
    mockSession("u1");
    const { container } = renderReason("pending", "stale reason");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when rejected but no reason was given", async () => {
    mockSession("u1");
    const { container } = renderReason("rejected", null);
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a viewer who is not the author", async () => {
    mockSession("someone-else");
    const { container } = renderReason("rejected", "reason", "u1");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a signed-out visitor", async () => {
    mockSignedOut();
    const { container } = renderReason("rejected", "reason");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
