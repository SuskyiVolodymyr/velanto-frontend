import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { PlayFallback } from "./PlayFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/src/features/play/PlayRouter", () => ({
  PlayRouter: () => <div>PlayRouter</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK: Pack = {
  id: "p1",
  title: "Pending Pack",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  groups: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("PlayFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders PlayRouter once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: null,
    });
    render(<PlayFallback packId="p1" />);
    expect(screen.getByText("PlayRouter")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<PlayFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<PlayFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
