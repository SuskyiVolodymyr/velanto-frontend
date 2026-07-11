import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("shows the uppercased first letter of the username", () => {
    render(<UserAvatar username="Quizmaster" />);
    expect(screen.getByText("Q")).toBeInTheDocument();
  });

  it("uppercases an already-lowercase initial", () => {
    render(<UserAvatar username="alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to a neutral glyph for an empty username", () => {
    render(<UserAvatar username="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies caller classes for size and shape", () => {
    render(<UserAvatar username="bob" className="h-11 w-11 rounded-full" />);
    const el = screen.getByText("B");
    expect(el).toHaveClass("h-11", "w-11", "rounded-full");
  });
});
