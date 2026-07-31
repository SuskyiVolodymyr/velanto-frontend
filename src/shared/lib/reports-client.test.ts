import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { reportsClient } from "@/src/shared/lib/reports-client";

vi.mock("@/src/shared/lib/api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("reportsClient", () => {
  it("list() GETs /reports with status/type/page/limit query params", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await reportsClient.list({
      status: "new",
      type: "pack",
      page: 2,
      limit: 20,
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/reports?status=new&type=pack&page=2&limit=20",
    );
  });

  it("list() passes targetId through for a single target's report history", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    await reportsClient.list({ targetId: "user-1", limit: 10 });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/reports?targetId=user-1&limit=10",
    );
  });

  it("list() omits query params when no filters given", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await reportsClient.list({});
    expect(mockedApiClient.get).toHaveBeenCalledWith("/reports");
  });
});
