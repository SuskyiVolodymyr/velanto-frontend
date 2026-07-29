import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomLeaderboard } from "./RoomLeaderboard";

const ENTRIES = [
  { userId: "u2", username: "Bob", avatarKey: null, score: 3 },
  { userId: "u1", username: "Alice", avatarKey: null, score: 5 },
  { userId: "u3", username: "Cy", avatarKey: null, score: 1 },
];

describe("RoomLeaderboard", () => {
  it("sorts by score descending and marks the top scorer as the winner", () => {
    render(<RoomLeaderboard entries={ENTRIES} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("5");
    expect(screen.getByText(/winner/i)).toBeInTheDocument();
  });

  it("a genuine tie for first shows every tied player as a winner", () => {
    render(
      <RoomLeaderboard
        entries={[
          { userId: "u1", username: "Alice", avatarKey: null, score: 4 },
          { userId: "u2", username: "Bob", avatarKey: null, score: 4 },
        ]}
      />,
    );
    expect(screen.getAllByText(/winner/i)).toHaveLength(2);
  });
});
