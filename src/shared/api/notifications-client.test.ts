import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificationsClient } from "./notifications-client";
import { apiClient } from "./api-client";

vi.mock("./api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("notificationsClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("list() calls GET /notifications with no query when filters are empty", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await notificationsClient.list();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications");
  });

  it("list() serializes page/limit into the query string", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    await notificationsClient.list({ page: 2, limit: 5 });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/notifications?page=2&limit=5",
    );
  });
});
