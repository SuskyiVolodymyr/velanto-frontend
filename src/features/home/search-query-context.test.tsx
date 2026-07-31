import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SearchQueryProvider, useSearchQuery } from "./search-query-context";

/** Renders both sides of the split: an input that writes, a label that reads. */
function Harness() {
  const { input, setInput, query, commit, hydrated } = useSearchQuery();
  return (
    <>
      <input
        aria-label="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      <button type="button" onClick={commit}>
        commit
      </button>
      <p data-testid="query">{query}</p>
      <p data-testid="hydrated">{String(hydrated)}</p>
    </>
  );
}

function setup() {
  render(
    <SearchQueryProvider>
      <Harness />
    </SearchQueryProvider>,
  );
  return screen.getByLabelText("search") as HTMLInputElement;
}

/** Type without user-event, which doesn't cooperate with fake timers here. */
function type(field: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SearchQueryProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not publish a query until typing pauses", () => {
    const field = setup();

    type(field, "zel");
    expect(screen.getByTestId("query")).toHaveTextContent("");

    act(() => void vi.advanceTimersByTime(299));
    expect(screen.getByTestId("query")).toHaveTextContent("");

    act(() => void vi.advanceTimersByTime(1));
    expect(screen.getByTestId("query")).toHaveTextContent("zel");
  });

  // The whole point of debouncing: one search per pause, not one per keystroke.
  it("restarts the wait on every keystroke", () => {
    const field = setup();

    type(field, "z");
    act(() => void vi.advanceTimersByTime(200));
    type(field, "ze");
    act(() => void vi.advanceTimersByTime(200));
    type(field, "zel");
    expect(screen.getByTestId("query")).toHaveTextContent("");

    act(() => void vi.advanceTimersByTime(300));
    expect(screen.getByTestId("query")).toHaveTextContent("zel");
  });

  it("trims the published query but leaves what the user typed alone", () => {
    const field = setup();

    type(field, "  zelda  ");
    act(() => void vi.advanceTimersByTime(300));

    expect(screen.getByTestId("query")).toHaveTextContent("zelda");
    expect(field.value).toBe("  zelda  ");
  });

  it("publishes immediately on commit, without waiting out the debounce", () => {
    const field = setup();

    type(field, "zelda");
    act(() => void screen.getByText("commit").click());

    expect(screen.getByTestId("query")).toHaveTextContent("zelda");
  });

  // Shareable/bookmarkable search, but via replaceState — a router navigation
  // per keystroke would re-run the server page (and its DB read) each time.
  it("mirrors the query into ?q= without a navigation", () => {
    const field = setup();

    type(field, "zelda");
    act(() => void vi.advanceTimersByTime(300));
    expect(window.location.search).toBe("?q=zelda");

    type(field, "");
    act(() => void vi.advanceTimersByTime(300));
    expect(window.location.search).toBe("");
  });

  it("adopts a shared ?q= link into the field on mount", () => {
    window.history.replaceState(null, "", "/?q=zelda");
    const field = setup();

    expect(field.value).toBe("zelda");
    expect(screen.getByTestId("query")).toHaveTextContent("zelda");
  });

  // `query` is empty both before adoption and after a deliberate clear; only
  // `hydrated` separates them, and consumers fall back to their server-rendered
  // term while it's false. Getting this wrong resurrects a cleared search.
  it("reports hydrated only after the mount read, then stays empty on clear", () => {
    window.history.replaceState(null, "", "/");
    render(
      <SearchQueryProvider>
        <Harness />
      </SearchQueryProvider>,
    );
    const field = screen.getByLabelText("search") as HTMLInputElement;

    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");

    type(field, "zelda");
    act(() => void vi.advanceTimersByTime(300));
    type(field, "");
    act(() => void vi.advanceTimersByTime(300));

    expect(screen.getByTestId("query")).toHaveTextContent("");
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
  });
});
