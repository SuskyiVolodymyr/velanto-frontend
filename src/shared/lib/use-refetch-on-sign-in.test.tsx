import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useRefetchOnSignIn } from "@/src/shared/lib/use-refetch-on-sign-in";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));

function setStatus(status: "loading" | "authenticated" | "unauthenticated") {
  vi.mocked(useAuth).mockReturnValue({
    status,
  } as ReturnType<typeof useAuth>);
}

function Harness({ refetch }: { refetch: () => void }) {
  useRefetchOnSignIn(refetch);
  return null;
}

describe("useRefetchOnSignIn", () => {
  it("refetches once when the session resolves loading -> authenticated", () => {
    const refetch = vi.fn();
    setStatus("loading");
    const { rerender } = render(<Harness refetch={refetch} />);
    expect(refetch).not.toHaveBeenCalled();

    setStatus("authenticated");
    rerender(<Harness refetch={refetch} />);

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not refetch for an anonymous session (loading -> unauthenticated)", () => {
    const refetch = vi.fn();
    setStatus("loading");
    const { rerender } = render(<Harness refetch={refetch} />);

    setStatus("unauthenticated");
    rerender(<Harness refetch={refetch} />);

    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not refetch when already authenticated on mount (client-side nav)", () => {
    const refetch = vi.fn();
    setStatus("authenticated");
    const { rerender } = render(<Harness refetch={refetch} />);

    rerender(<Harness refetch={refetch} />);

    expect(refetch).not.toHaveBeenCalled();
  });
});
