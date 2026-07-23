import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackCard } from "./PackCard";
import type { Pack } from "@/src/shared/types/pack";

const BASE_PACK = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en" as Pack["language"],
  tags: ["Anime"] as Pack["tags"],
  groups: [{ id: "g1", name: "2016", items: [] }] as Pack["groups"],
  rounds: [
    { id: "r1", slots: [{ groupId: "g1", mode: "manual" }] },
  ] as Pack["rounds"],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved" as const,
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("PackCard", () => {
  it("counts rounds for a save_one pack", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [
        { id: "g1", name: "2016", items: [] },
        { id: "g2", name: "2020", items: [] },
      ],
      rounds: [
        { id: "r1", slots: [{ groupId: "g1", mode: "manual" }] },
        { id: "r2", slots: [{ groupId: "g2", mode: "manual" }] },
      ],
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("2 rounds")).toBeInTheDocument();
    expect(screen.getByText("Save One")).toBeInTheDocument();
  });

  it("shows the author @handle when the feed includes author info", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      author: {
        id: "u1",
        username: "alice",
        avatarKey: null,
        role: "user",
        trusted: false,
      },
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("@alice")).toBeInTheDocument();
  });

  it("omits the author line when the pack has no author summary", () => {
    const pack: Pack = { ...BASE_PACK, format: "save_one" };
    render(<PackCard pack={pack} />);

    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  describe("created time", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function renderAgedPack(createdAt: string, now: string) {
      vi.setSystemTime(new Date(now));
      render(
        <PackCard pack={{ ...BASE_PACK, format: "save_one", createdAt }} />,
      );
    }

    it("shows how long ago the pack was created, in a machine-readable <time>", () => {
      renderAgedPack("2026-01-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z");
      expect(screen.getByText("120 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-01-01T00:00:00.000Z",
      );

      // Minutes for a freshly created pack.
      renderAgedPack("2026-01-01T00:00:00.000Z", "2026-01-01T00:02:00.000Z");
      expect(screen.getByText("2 minutes ago")).toBeInTheDocument();

      // Day-capped on purpose: even a year-old pack still reads in days.
      renderAgedPack("2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
      expect(screen.getByText("365 days ago")).toBeInTheDocument();
    });

    // Intl.RelativeTimeFormat throws a RangeError on NaN, so an unparseable
    // createdAt must not be allowed to take the whole card down.
    it("renders the card without a timestamp when createdAt is unusable", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard pack={{ ...BASE_PACK, format: "save_one", createdAt: "" }} />,
      );

      expect(screen.getByText(BASE_PACK.title)).toBeInTheDocument();
      expect(document.querySelector("time")).not.toBeInTheDocument();
    });

    // The card dates the pack by when it went PUBLIC, not when the row was made.
    // A pack can sit as a draft or wait in moderation, so firstPublishedAt is the
    // honest "published X ago"; createdAt is only the fallback.
    it("prefers firstPublishedAt over createdAt for the timestamp", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: "2026-01-01T00:00:00.000Z",
            firstPublishedAt: "2026-04-01T00:00:00.000Z",
          }}
        />,
      );

      // 30 days since publication (Apr 1 → May 1), not 120 since creation.
      expect(screen.getByText("30 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-04-01T00:00:00.000Z",
      );
      expect(screen.queryByText("120 days ago")).not.toBeInTheDocument();
    });

    it("falls back to createdAt when firstPublishedAt is null", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: "2026-01-01T00:00:00.000Z",
            firstPublishedAt: null,
          }}
        />,
      );

      expect(screen.getByText("120 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-01-01T00:00:00.000Z",
      );
    });
  });

  it("uses the rounds length as the round count for an nxn pack", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "nxn",
      groups: [
        { id: "a", name: "Boys", items: [] },
        { id: "b", name: "Girls", items: [] },
      ],
      rounds: Array.from({ length: 8 }, (_, i) => ({
        id: `r${i + 1}`,
        slots: [
          { groupId: "a", mode: "random" as const, count: 1 },
          { groupId: "b", mode: "random" as const, count: 1 },
        ],
      })),
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("8 rounds")).toBeInTheDocument();
    expect(screen.getByText("NxN")).toBeInTheDocument();
  });

  it("shows 'No plays yet' when the pack has never been played", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", items: [] }],
      totalPlays: 0,
      avgAgreementPercent: 0,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("No plays yet")).toBeInTheDocument();
  });

  it("shows the play count and agreement percentage when the pack has been played", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", items: [] }],
      totalPlays: 1,
      avgAgreementPercent: 75,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("1 play · 75% agreement")).toBeInTheDocument();
  });

  it("pluralizes play count for more than one play", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", items: [] }],
      totalPlays: 124,
      avgAgreementPercent: 68,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("124 plays · 68% agreement")).toBeInTheDocument();
  });

  it("rounds a fractional agreement percentage for display", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", items: [] }],
      totalPlays: 3,
      avgAgreementPercent: 33.3,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("3 plays · 33% agreement")).toBeInTheDocument();
  });

  it("shows a pending badge when showStatus is true and the pack is pending", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
        showStatus
      />,
    );
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });

  it("shows a rejected badge when showStatus is true and the pack is rejected", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "rejected" }}
        showStatus
      />,
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("shows no status badge when showStatus is true but the pack is approved", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "approved" }}
        showStatus
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });

  it("shows no status badge when showStatus is not passed, even for a pending pack", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });

  it("renders the custom cover image when a coverImageKey is set", () => {
    const { container } = render(
      <PackCard
        pack={{
          ...BASE_PACK,
          format: "save_one",
          coverImageKey: "media/cover/x.webp",
        }}
      />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("media/cover/x.webp");
  });

  it("renders no cover image (gradient only) when coverImageKey is absent", () => {
    const { container } = render(
      <PackCard pack={{ ...BASE_PACK, format: "save_one" }} />,
    );

    expect(container.querySelector("img")).toBeNull();
  });
});
