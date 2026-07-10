import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { StatusBadge } from "./StatusBadge";

// A wrapper (not renderWithIntl) so `rerender` re-applies the intl provider —
// RTL preserves the `wrapper` option across rerenders, renderWithIntl does not.
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });

describe("StatusBadge", () => {
  it("renders pack statuses with their labels", () => {
    const { rerender } = render(<StatusBadge kind="pack" status="pending" />);
    expect(screen.getByText("Pending review")).toBeInTheDocument();

    rerender(<StatusBadge kind="pack" status="approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();

    rerender(<StatusBadge kind="pack" status="rejected" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders feedback statuses with their labels", () => {
    const { rerender } = render(<StatusBadge kind="feedback" status="new" />);
    expect(screen.getByText("New")).toBeInTheDocument();

    rerender(<StatusBadge kind="feedback" status="in_progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();

    rerender(<StatusBadge kind="feedback" status="declined" />);
    expect(screen.getByText("Declined")).toBeInTheDocument();
  });

  it("renders report statuses with their labels", () => {
    const { rerender } = render(<StatusBadge kind="report" status="new" />);
    expect(screen.getByText("New")).toBeInTheDocument();

    rerender(<StatusBadge kind="report" status="reviewing" />);
    expect(screen.getByText("Reviewing")).toBeInTheDocument();

    rerender(<StatusBadge kind="report" status="closed" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("applies the tone class for the status", () => {
    render(<StatusBadge kind="pack" status="rejected" />);
    expect(screen.getByText("Rejected")).toHaveClass("text-red-400");
  });

  it("merges a custom className", () => {
    render(
      <StatusBadge kind="feedback" status="done" className="custom-class" />,
    );
    const el = screen.getByText("Done");
    expect(el).toHaveClass("custom-class");
    expect(el).toHaveClass("text-green-400");
  });

  it("conveys status as text, not colour alone", () => {
    render(<StatusBadge kind="report" status="reviewing" />);
    // The label text is present in the accessible DOM (screen-reader legible).
    expect(screen.getByText("Reviewing")).toBeVisible();
  });
});
