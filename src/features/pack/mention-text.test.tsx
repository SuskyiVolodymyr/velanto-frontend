import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderCommentBody } from "./mention-text";

function view(body: string) {
  return render(<p>{renderCommentBody(body)}</p>);
}

describe("renderCommentBody", () => {
  it("highlights an @mention as an accent span", () => {
    view("great point @alice");
    const mention = screen.getByText("@alice");
    expect(mention.tagName).toBe("SPAN");
    expect(mention).toHaveClass("text-acc");
  });

  it("keeps surrounding text as plain text", () => {
    const { container } = view("hey @bob nice one");
    expect(container.textContent).toBe("hey @bob nice one");
    // Only the handle is wrapped; the rest is not a span.
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it("highlights multiple mentions", () => {
    view("@alice and @bob");
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  it("does not highlight an email address", () => {
    const { container } = view("reach me at bob@example.com");
    expect(container.querySelectorAll("span")).toHaveLength(0);
    expect(container.textContent).toBe("reach me at bob@example.com");
  });

  it("does not highlight a mid-word @", () => {
    const { container } = view("foo@bar baz");
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("renders a body with no mentions as-is", () => {
    const { container } = view("just a plain comment");
    expect(container.querySelectorAll("span")).toHaveLength(0);
    expect(container.textContent).toBe("just a plain comment");
  });
});
