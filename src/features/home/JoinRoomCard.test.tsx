import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { ApiError } from "@/src/shared/lib/api-client";
import { JoinRoomCard } from "./JoinRoomCard";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const auth = vi.hoisted(() => ({
  current: { user: { id: "u1" } as { id: string } | null },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => auth.current,
}));

const { join } = vi.hoisted(() => ({ join: vi.fn() }));
vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { join },
}));

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <JoinRoomCard />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = { user: { id: "u1" } };
});

describe("JoinRoomCard", () => {
  it("normalizes the code, joins, and routes into the room", async () => {
    const user = userEvent.setup();
    join.mockResolvedValue({ id: "room-9" });
    renderCard();

    await user.type(screen.getByLabelText("Room code"), " ab-12 ");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(join).toHaveBeenCalledWith("AB-12");
    expect(push).toHaveBeenCalledWith("/rooms/room-9");
  });

  it("shows an error and does not call the API for an empty code", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(join).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a room code.")).toBeInTheDocument();
  });

  it("shows a not-found message on a 404", async () => {
    const user = userEvent.setup();
    join.mockRejectedValue(new ApiError(404, "Not Found", null));
    renderCard();

    await user.type(screen.getByLabelText("Room code"), "ZZZ99");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByText("No room with that code. Check it and try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an unavailable message on a 409", async () => {
    const user = userEvent.setup();
    join.mockRejectedValue(new ApiError(409, "Conflict", null));
    renderCard();

    await user.type(screen.getByLabelText("Room code"), "FULL1");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByText(/isn't taking new players/),
    ).toBeInTheDocument();
  });

  it("blocks join for a signed-out visitor (disabled, no redirect)", async () => {
    const user = userEvent.setup();
    auth.current = { user: null };
    renderCard();

    // The input is natively disabled, but the button is gated with
    // aria-disabled (not native `disabled`) so the sign-in tooltip stays
    // reachable by keyboard/AT — clicking it must still no-op.
    expect(screen.getByLabelText("Room code")).toBeDisabled();
    const joinButton = screen.getByRole("button", { name: "Join" });
    expect(joinButton).toHaveAttribute("aria-disabled", "true");

    await user.click(joinButton);
    expect(join).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
