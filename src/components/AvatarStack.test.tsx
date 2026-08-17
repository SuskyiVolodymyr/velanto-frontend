import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarStack } from "./AvatarStack";

const users = [
  { username: "alice" },
  { username: "dave" },
  { username: "rosa" },
  { username: "milo" },
  { username: "nina" },
  { username: "omar" },
];

describe("AvatarStack", () => {
  it("renders one avatar per user when no max is set", () => {
    render(<AvatarStack users={users.slice(0, 3)} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("caps at max and shows a +N overflow chip for the rest", () => {
    render(<AvatarStack users={users} max={3} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.queryByText("M")).not.toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows no overflow chip when the users fit exactly in max", () => {
    render(<AvatarStack users={users.slice(0, 3)} max={3} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("overlaps every avatar after the first, but not the first", () => {
    render(<AvatarStack users={users.slice(0, 3)} />);
    expect(screen.getByText("A").className).not.toMatch(/-ml-/);
    expect(screen.getByText("D").className).toMatch(/-ml-/);
    expect(screen.getByText("R").className).toMatch(/-ml-/);
  });

  it("exposes an accessible label as a single img role when provided", () => {
    render(<AvatarStack users={users.slice(0, 2)} label="2 in the room" />);
    expect(
      screen.getByRole("img", { name: "2 in the room" }),
    ).toBeInTheDocument();
  });
});
