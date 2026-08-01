import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import { DashboardHero } from "./DashboardHero";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const ns = namespace
      .split(".")
      .reduce<Record<string, unknown>>(
        (acc, key) => acc[key] as Record<string, unknown>,
        messages as unknown as Record<string, unknown>,
      );
    return (key: string) => ns[key] as string;
  },
}));

// The gate under test lives in DashboardHero itself; JoinRoomCard has its own
// full test suite (including its own copy of this same ROOMS_DORMANT gate),
// so it's stubbed here to keep this test focused on the hero's own behavior.
vi.mock("@/src/features/home/JoinRoomCard", () => ({
  JoinRoomCard: () => <div data-testid="join-room-card-stub" />,
}));

// Same pattern as JoinRoomCard.test.tsx: control the dormancy flag per test
// without disturbing room-types' other exports.
const flag = vi.hoisted(() => ({ dormant: false }));
vi.mock("@/src/features/friends-rooms/room-types", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/src/features/friends-rooms/room-types")
    >();
  return {
    ...actual,
    get ROOMS_DORMANT() {
      return flag.dormant;
    },
  };
});

beforeEach(() => {
  flag.dormant = false;
});

describe("DashboardHero", () => {
  it("renders the promo pitch and the join card while rooms are live", async () => {
    render(await DashboardHero());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: messages.home.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.home.hero.badge)).toBeInTheDocument();
    expect(screen.getByText(messages.home.hero.subtitle)).toBeInTheDocument();
    expect(screen.getByTestId("join-room-card-stub")).toBeInTheDocument();
  });

  it("drops the promo pitch and join card while rooms are dormant, keeping a single fallback h1", async () => {
    flag.dormant = true;
    render(await DashboardHero());

    expect(screen.queryByTestId("join-room-card-stub")).not.toBeInTheDocument();
    expect(
      screen.queryByText(messages.home.hero.badge),
    ).not.toBeInTheDocument();

    const heading = screen.getByRole("heading", {
      level: 1,
      name: messages.home.hero.title,
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("sr-only");
  });
});
