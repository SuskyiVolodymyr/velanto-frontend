import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { JoinByLink } from "./JoinByLink";
import { ApiError } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const join = vi.fn();
vi.mock("./friends-rooms-client", () => ({
  friendsRoomsClient: {
    join: (...args: unknown[]) => join(...args),
  },
}));

let currentUser: User | null;
let currentStatus: "loading" | "authenticated" | "unauthenticated";
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser, status: currentStatus }),
}));

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
});

describe("JoinByLink — signed out", () => {
  it("redirects to sign-in preserving the join path, and does not join", async () => {
    currentUser = null;
    currentStatus = "unauthenticated";
    render(<JoinByLink code="ABC123" />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/auth?next=" + encodeURIComponent("/rooms/join/ABC123"),
      ),
    );
    expect(join).not.toHaveBeenCalled();
  });

  it("does nothing while auth is still loading", () => {
    currentUser = null;
    currentStatus = "loading";
    render(<JoinByLink code="ABC123" />);

    expect(replace).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
  });
});

describe("JoinByLink — signed in", () => {
  it("joins with the code and replaces to the room on success", async () => {
    join.mockResolvedValue({ id: "room-9" });
    render(<JoinByLink code="ABC123" />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/rooms/room-9"),
    );
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
