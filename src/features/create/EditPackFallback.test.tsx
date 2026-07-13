import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { EditPackFallback } from "@/src/features/create/EditPackFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
// Stub the seeded form — its own behavior is covered in EditPackScreen.test.
vi.mock("@/src/features/create/EditPackScreen", () => ({
  EditPackScreen: ({ pack }: { pack: Pack }) => <div>{`edit:${pack.id}`}</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK = { id: "p1" } as Pack;

describe("EditPackFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the edit form once the authed retry resolves ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: null,
    });
    render(<EditPackFallback packId="p1" />);
    expect(screen.getByText("edit:p1")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the retry is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<EditPackFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the authed retry also fails", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<EditPackFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });

  it("requests the pack without results (the edit form doesn't need them)", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    render(<EditPackFallback packId="p1" />);
    expect(mockedUsePackFallback).toHaveBeenCalledWith("p1", {
      needsResults: false,
    });
  });
});
