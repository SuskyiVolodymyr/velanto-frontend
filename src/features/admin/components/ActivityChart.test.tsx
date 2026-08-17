import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { ActivityChart, rangeFromParam } from "./ActivityChart";
import { adminClient } from "@/api/admin-client";
import type { ActivityPoint } from "@/types/admin";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => searchParams,
}));

vi.mock("@/api/admin-client", () => ({
  adminClient: { activity: vi.fn() },
}));

const point = (at: string, unique: number): ActivityPoint => ({
  at,
  unique,
  registered: unique,
  guests: 0,
  anonymous: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(adminClient.activity).mockResolvedValue([]);
});

describe("rangeFromParam", () => {
  it("accepts the three real ranges", () => {
    expect(rangeFromParam("day")).toBe("day");
    expect(rangeFromParam("week")).toBe("week");
    expect(rangeFromParam("month")).toBe("month");
  });

  // `?range=` is reader-editable and survives being pasted around, so anything
  // that isn't a range has to fall back rather than reach the API, which 400s
  // on an unknown value.
  it("falls back to the day view for anything else", () => {
    expect(rangeFromParam(null)).toBe("day");
    expect(rangeFromParam("")).toBe("day");
    expect(rangeFromParam("year")).toBe("day");
    expect(rangeFromParam("DAY")).toBe("day");
  });
});

describe("ActivityChart", () => {
  it("asks the backend for the range the URL names", async () => {
    searchParams = new URLSearchParams("range=month");
    render(<ActivityChart />);

    await vi.waitFor(() =>
      expect(adminClient.activity).toHaveBeenCalledWith("month"),
    );
  });

  // The range lives in the URL for the same reason `?tab=` does: a shared
  // /admin?tab=overview&range=month link has to open on the month, and a
  // refresh must not throw the reader back to the day view.
  it("writes the chosen range to the URL", async () => {
    render(<ActivityChart />);

    await userEvent.click(await screen.findByRole("tab", { name: "Week" }));

    expect(replace).toHaveBeenCalledWith("/admin?range=week", {
      scroll: false,
    });
  });

  // The day view is the default, so it needs no parameter — a bare /admin
  // already says the same thing, and a tidy URL is the one people share.
  it("drops the parameter when returning to the day view", async () => {
    searchParams = new URLSearchParams("range=month");
    render(<ActivityChart />);

    await userEvent.click(await screen.findByRole("tab", { name: "Day" }));

    expect(replace).toHaveBeenCalledWith("/admin", { scroll: false });
  });

  // Other query parameters belong to the screen around this chart — dropping
  // `?tab=` would bounce the reader to the Overview tab mid-interaction.
  it("preserves the other query parameters", async () => {
    searchParams = new URLSearchParams("tab=overview");
    render(<ActivityChart />);

    await userEvent.click(await screen.findByRole("tab", { name: "Week" }));

    expect(replace).toHaveBeenCalledWith("/admin?tab=overview&range=week", {
      scroll: false,
    });
  });

  it("names every bar with its count and its moment", async () => {
    const at = "2026-08-15T09:00:00.000Z";
    const local = new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    vi.mocked(adminClient.activity).mockResolvedValue([
      point(at, 4),
      point("2026-08-15T10:00:00.000Z", 7),
    ]);
    render(<ActivityChart />);

    expect(
      await screen.findByRole("button", {
        name: `4 unique players at ${local}`,
      }),
    ).toBeInTheDocument();
  });

  // "So I know when it was" — the axis can only afford a label every few bars,
  // so the moment leads the hover tooltip on every one of them.
  it("puts the moment in each bar's tooltip", async () => {
    const at = "2026-08-15T09:00:00.000Z";
    const local = new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    vi.mocked(adminClient.activity).mockResolvedValue([point(at, 4)]);
    render(<ActivityChart />);

    await screen.findByRole("button", { name: `4 unique players at ${local}` });
    expect(screen.getAllByText(local).length).toBeGreaterThan(0);
  });

  // Unique visitors cannot be summed across hours, so an aggregated point is a
  // PEAK. A sighted reader gets the footnote; a screen-reader user must not be
  // left to infer it from text they may never reach, so the bar says so too.
  it("says a day is a peak, in the footnote and in every bar's name", async () => {
    searchParams = new URLSearchParams("range=week");
    vi.mocked(adminClient.activity).mockResolvedValue([
      point("2026-08-14T00:00:00.000Z", 7),
    ]);
    render(<ActivityChart />);

    expect(
      await screen.findByRole("button", {
        name: "7 unique players at the busiest hour of 14 Aug",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cannot be added up across hours/),
    ).toBeInTheDocument();
  });

  // The day view IS a real hourly reading, so the peak caveat would be a lie
  // there — it must not appear.
  it("does not claim a peak on the hourly view", async () => {
    const at = "2026-08-15T09:00:00.000Z";
    const local = new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    vi.mocked(adminClient.activity).mockResolvedValue([point(at, 4)]);
    render(<ActivityChart />);

    await screen.findByRole("button", { name: `4 unique players at ${local}` });
    expect(
      screen.queryByText(/cannot be added up across hours/),
    ).not.toBeInTheDocument();
  });

  // An hourly point is an INSTANT, so it belongs in the reader's own clock.
  // The first version printed UTC and an admin in Kyiv saw the latest bar
  // labelled three hours before their own time, which reads as a broken chart
  // (#315 follow-up).
  it("labels hourly points in the reader's own time, not UTC", async () => {
    const at = "2026-08-15T02:00:00.000Z";
    const expected = new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    vi.mocked(adminClient.activity).mockResolvedValue([point(at, 3)]);
    render(<ActivityChart />);

    expect(
      await screen.findByRole("button", {
        name: `3 unique players at ${expected}`,
      }),
    ).toBeInTheDocument();
  });

  // A DAILY point is not an instant: the backend groups hours into days in UTC,
  // so the bucket is a UTC day. Relabelling it locally would name it after a
  // day whose hours it does not contain.
  it("keeps daily points on the UTC day they were cut from", async () => {
    searchParams = new URLSearchParams("range=week");
    vi.mocked(adminClient.activity).mockResolvedValue([
      point("2026-08-14T00:00:00.000Z", 5),
    ]);
    render(<ActivityChart />);

    expect(
      await screen.findByRole("button", {
        name: "5 unique players at the busiest hour of 14 Aug",
      }),
    ).toBeInTheDocument();
  });

  it("shows an error instead of an empty chart when the fetch fails", async () => {
    vi.mocked(adminClient.activity).mockRejectedValue(new Error("nope"));
    render(<ActivityChart />);

    expect(
      await screen.findByText("Could not load activity."),
    ).toBeInTheDocument();
  });
});
