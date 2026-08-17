import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { PackDetailFallback } from "./PackDetailFallback";
import { usePackFallback } from "@/hooks/use-pack-fallback";
import type { Pack } from "@/types/pack";
import type { PackResults } from "@/types/play-results";

vi.mock("@/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/features/pack/components/VoteButtons", () => ({
  VoteButtons: () => <div>VoteButtons</div>,
}));
vi.mock("@/features/pack/components/CommentSection", () => ({
  CommentSection: () => <div>CommentSection</div>,
}));
vi.mock("@/features/pack/components/PackCreatorCard", () => ({
  PackCreatorCard: () => <div>PackCreatorCard</div>,
}));
vi.mock("@/features/pack/components/PackPlayButton", () => ({
  PackPlayButton: () => <div>PackPlayButton</div>,
}));
vi.mock("@/features/pack/components/PackBannerAuthor", () => ({
  PackBannerAuthor: () => <div>PackBannerAuthor</div>,
}));
vi.mock("@/features/pack/components/PackOwnerActions", () => ({
  PackOwnerActions: () => <div>PackOwnerActions</div>,
}));
// Auth-context client island (see PackOwnerStatusBadge.test); stub so this
// fallback test doesn't need an AuthProvider.
vi.mock("@/features/pack/components/PackOwnerStatusBadge", () => ({
  PackOwnerStatusBadge: () => null,
}));
vi.mock("@/features/pack/components/PackRejectionReason", () => ({
  PackRejectionReason: () => null,
}));
// Same treatment, same reason: an author-gated island whose useAuth() throws
// outside an AuthProvider.
vi.mock("@/features/pack/components/PackChangesRequestedBanner", () => ({
  PackChangesRequestedBanner: () => null,
}));
// FriendsRoomEntry is an auth-gated client island (own tests in
// FriendsRoomEntry.test.tsx — useAuth()/useRouter() need a real provider/
// next/navigation mock this fallback test doesn't otherwise set up). Stub it
// the same way PackDetailScreen.test.tsx does.
vi.mock("@/features/friends-rooms/components/FriendsRoomEntry", () => ({
  FriendsRoomEntry: () => <div>FriendsRoomEntry</div>,
}));
// ReportPackDialog is another auth-gated client island — stub the same way.
vi.mock("@/features/pack/components/ReportPackDialog", () => ({
  ReportPackDialog: () => <div>ReportPackDialog</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK: Pack = {
  id: "p1",
  title: "Pending Pack",
  description: "desc",
  coverTone: "#000",
  language: "en",
  format: "save_one",
  tags: [],
  groups: [],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  likes: 0,
  dislikes: 0,
  myVote: null,
};
const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("PackDetailFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the pack once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: RESULTS,
      availableModes: [],
    });
    render(<PackDetailFallback packId="p1" />);
    expect(screen.getByText("Pending Pack")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<PackDetailFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<PackDetailFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
