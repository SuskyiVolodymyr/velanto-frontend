import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { ResultFallback } from "./ResultFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/src/features/result/ResultScreen", () => ({ ResultScreen: () => <div>ResultScreen</div> }));

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
const RESULTS: PackResults = { packId: "p1", format: "save_one", totalPlays: 0, rounds: [] };

describe("ResultFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders ResultScreen once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({ status: "ready", pack: PACK, results: RESULTS });
    render(<ResultFallback packId="p1" />);
    expect(screen.getByText("ResultScreen")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<ResultFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<ResultFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
