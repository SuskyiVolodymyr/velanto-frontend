import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { reportsClient } from "@/src/shared/lib/reports-client";

vi.mock("@/src/shared/lib/api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("reportsClient", () => {
  it("create() POSTs to /reports", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1" });
    const input = { type: "pack" as const, targetId: "p1", reason: "spam" };
    const result = await reportsClient.create(input);
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports", input);
    expect(result).toEqual({ id: "r1" });
  });

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

  it("getById() GETs /reports/:id", async () => {
    mockedApiClient.get.mockResolvedValue({ id: "r1" });
    await reportsClient.getById("r1");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/reports/r1");
  });

  it("review() POSTs to /reports/:id/review", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1", status: "reviewing" });
    await reportsClient.review("r1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports/r1/review");
  });

  it("close() POSTs to /reports/:id/close", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1", status: "closed" });
    await reportsClient.close("r1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports/r1/close");
  });
});
