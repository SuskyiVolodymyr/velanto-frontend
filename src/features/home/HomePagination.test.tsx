import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { HomePagination } from "./HomePagination";

describe("HomePagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <HomePagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page with aria-current", () => {
    render(<HomePagination page={2} totalPages={3} onPageChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "2", current: "page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("disables Previous on the first page", () => {
    render(<HomePagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    render(<HomePagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("calls onPageChange with the clicked page number", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <HomePagination page={1} totalPages={3} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("Next and Previous step by one", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <HomePagination page={2} totalPages={3} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("renders a non-interactive ellipsis for long page ranges", () => {
    render(<HomePagination page={10} totalPages={20} onPageChange={vi.fn()} />);
    // The gaps around page 10 collapse to ellipses, which are not buttons.
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "…" })).not.toBeInTheDocument();
  });
});
