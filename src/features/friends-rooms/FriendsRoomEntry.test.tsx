import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { FriendsRoomEntry } from "./FriendsRoomEntry";
import { ApiError } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const create = vi.fn();
const join = vi.fn();
vi.mock("./friends-rooms-client", () => ({
  friendsRoomsClient: {
    create: (...args: unknown[]) => create(...args),
    join: (...args: unknown[]) => join(...args),
  },
}));

let currentUser: User | null;
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
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
});

describe("FriendsRoomEntry — create", () => {
  it("offers Create room and Join by code", () => {
    render(<FriendsRoomEntry packId="pack-1" />);

    expect(
      screen.getByRole("button", { name: "Create room" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join by code" }),
    ).toBeInTheDocument();
  });

  it("creates a room for this pack and routes the host into it", async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: "room-9" });
    render(<FriendsRoomEntry packId="pack-1" />);

    await user.click(screen.getByRole("button", { name: "Create room" }));

    expect(create).toHaveBeenCalledWith("pack-1");
    expect(push).toHaveBeenCalledWith("/rooms/room-9");
  });

  it("surfaces an error if creating the room fails, and does not navigate", async () => {
    const user = userEvent.setup();
    create.mockRejectedValue(new ApiError(500, "Server Error", null));
    render(<FriendsRoomEntry packId="pack-1" />);

    await user.click(screen.getByRole("button", { name: "Create room" }));

    expect(
      await screen.findByText("Couldn't create the room. Try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks a signed-out visitor: Create does not fire", async () => {
    const user = userEvent.setup();
    currentUser = null;
    render(<FriendsRoomEntry packId="pack-1" />);

    await user.click(screen.getByRole("button", { name: "Create room" }));

    expect(create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks a signed-out visitor: Join by code does not open the modal", async () => {
    const user = userEvent.setup();
    currentUser = null;
    render(<FriendsRoomEntry packId="pack-1" />);

    await user.click(screen.getByRole("button", { name: "Join by code" }));

    // The modal title never appears — the control is gated, not opened.
    expect(screen.queryByText("Join a room")).not.toBeInTheDocument();
  });
});

describe("FriendsRoomEntry — join", () => {
  async function openJoin() {
    const user = userEvent.setup();
    render(<FriendsRoomEntry packId="pack-1" />);
    await user.click(screen.getByRole("button", { name: "Join by code" }));
    return user;
  }

  it("opens the modal, uppercases and trims the code, and routes in on success", async () => {
    join.mockResolvedValue({ id: "room-3" });
    const user = await openJoin();

    expect(screen.getByText("Join a room")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Enter code"), "  abc12  ");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(join).toHaveBeenCalledWith("ABC12");
    expect(push).toHaveBeenCalledWith("/rooms/room-3");
  });

  it("shows a friendly error and does not navigate when the code is unknown (404)", async () => {
    join.mockRejectedValue(new ApiError(404, "Not Found", null));
    const user = await openJoin();

    await user.type(screen.getByPlaceholderText("Enter code"), "NOPE1");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByText(
        "No room with that code. Check it and try again.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a friendly error and does not navigate when the room is full/started/locked (409)", async () => {
    join.mockRejectedValue(new ApiError(409, "Conflict", null));
    const user = await openJoin();

    await user.type(screen.getByPlaceholderText("Enter code"), "FULL1");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByText(/isn't taking new players/),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("validates an empty code before calling the API", async () => {
    const user = await openJoin();

    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(join).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a room code.")).toBeInTheDocument();
  });

  it("lets the user retry after a rejected join", async () => {
    join
      .mockRejectedValueOnce(new ApiError(404, "Not Found", null))
      .mockResolvedValueOnce({ id: "room-7" });
    const user = await openJoin();

    await user.type(screen.getByPlaceholderText("Enter code"), "wrong");
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(
      await screen.findByText(
        "No room with that code. Check it and try again.",
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Enter code"));
    await user.type(screen.getByPlaceholderText("Enter code"), "right");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(join).toHaveBeenLastCalledWith("RIGHT");
    expect(push).toHaveBeenCalledWith("/rooms/room-7");
  });
});
