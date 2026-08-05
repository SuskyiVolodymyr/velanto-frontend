import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { JoinByLink } from "./JoinByLink";
import { ApiError } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const join = vi.fn();
const joinAsGuest = vi.fn();
vi.mock("./friends-rooms-client", () => ({
  friendsRoomsClient: {
    join: (...args: unknown[]) => join(...args),
    joinAsGuest: (...args: unknown[]) => joinAsGuest(...args),
  },
}));

let currentUser: User | null;
let currentStatus: "loading" | "authenticated" | "unauthenticated";
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser, status: currentStatus }),
}));

// Toggle dormancy per test while preserving room-types' other exports. Default:
// rooms LIVE, so the flows below exercise the revived join/redirect behaviour.
const flag = vi.hoisted(() => ({ dormant: false }));
vi.mock("./room-types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./room-types")>();
  return {
    ...actual,
    get ROOMS_DORMANT() {
      return flag.dormant;
    },
  };
});

function asUser(): User {
  return {
    id: "u1",
    email: null,
    username: "Alice",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = asUser();
  currentStatus = "authenticated";
  flag.dormant = false;
});

describe("JoinByLink — rooms dormant", () => {
  it("shows the not-found state without joining or bouncing a signed-out visitor through sign-in", async () => {
    flag.dormant = true;
    currentUser = null;
    currentStatus = "unauthenticated";
    render(<JoinByLink code="ABC123" />);

    expect(await screen.findByText("Room not found")).toBeInTheDocument();
    expect(join).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("JoinByLink — signed out", () => {
  // Deliberately NOT a redirect to sign-in. Someone opening an invite link is
  // being invited to a game their friends are already in; a registration wall
  // at that exact moment is where the group falls apart.
  it("asks for a nickname instead of bouncing through sign-in", async () => {
    currentUser = null;
    currentStatus = "unauthenticated";
    render(<JoinByLink code="ABC123" />);

    expect(
      await screen.findByPlaceholderText("Pick a nickname"),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
  });

  it("joins as a guest with the link's code and replaces into the room", async () => {
    const user = userEvent.setup();
    currentUser = null;
    currentStatus = "unauthenticated";
    joinAsGuest.mockResolvedValue({
      token: "guest.jwt",
      guestId: "guest-1",
      room: { id: "room-9" },
    });
    render(<JoinByLink code="ABC123" />);

    await user.type(
      await screen.findByPlaceholderText("Pick a nickname"),
      "Sam",
    );
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(joinAsGuest).toHaveBeenCalledWith("ABC123", "Sam");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/rooms/room-9"));
  });

  // An account is still on offer, just not as a toll gate.
  it("keeps a sign-in link that returns here", async () => {
    currentUser = null;
    currentStatus = "unauthenticated";
    render(<JoinByLink code="ABC123" />);

    const link = await screen.findByRole("link", {
      name: "Or log in to your account",
    });
    expect(link).toHaveAttribute(
      "href",
      "/auth?next=" + encodeURIComponent("/rooms/join/ABC123"),
    );
  });

  it("shows the guest error inline and stays put on a bad nickname", async () => {
    const user = userEvent.setup();
    currentUser = null;
    currentStatus = "unauthenticated";
    joinAsGuest.mockRejectedValue(new ApiError(400, "Bad Request", null));
    render(<JoinByLink code="ABC123" />);

    await user.type(
      await screen.findByPlaceholderText("Pick a nickname"),
      "xx",
    );
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByText(
        "That nickname will not work. Use 2-16 letters, numbers or underscores.",
      ),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  // During "loading" a signed-in visitor's user is momentarily null; acting
  // then would flash the guest form at someone who has an account.
  it("does nothing while auth is still loading", () => {
    currentUser = null;
    currentStatus = "loading";
    render(<JoinByLink code="ABC123" />);

    expect(replace).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("Pick a nickname")).toBeNull();
  });
});

describe("JoinByLink — signed in", () => {
  it("joins with the code and replaces to the room on success", async () => {
    join.mockResolvedValue({ id: "room-9" });
    render(<JoinByLink code="ABC123" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/rooms/room-9"));
    expect(join).toHaveBeenCalledWith("ABC123");
  });

  it("shows the not-found state and does not navigate on a 404", async () => {
    join.mockRejectedValue(new ApiError(404, "Not Found", null));
    render(<JoinByLink code="NOPE12" />);

    expect(await screen.findByText("Room not found")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the unavailable state and does not navigate on a 409", async () => {
    join.mockRejectedValue(new ApiError(409, "Conflict", null));
    render(<JoinByLink code="FULL12" />);

    expect(await screen.findByText("Room unavailable")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the generic state and does not navigate on any other error", async () => {
    join.mockRejectedValue(new ApiError(500, "Server Error", null));
    render(<JoinByLink code="OOPS12" />);

    expect(
      await screen.findByText("Couldn't join the room"),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("fires the join only once across a re-render", async () => {
    join.mockResolvedValue({ id: "room-9" });
    const { rerender } = render(<JoinByLink code="ABC123" />);

    await waitFor(() => expect(join).toHaveBeenCalledTimes(1));
    rerender(<JoinByLink code="ABC123" />);

    expect(join).toHaveBeenCalledTimes(1);
  });
});
