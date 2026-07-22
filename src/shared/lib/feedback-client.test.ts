import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { feedbackClient } from "@/src/shared/lib/feedback-client";

vi.mock("@/src/shared/lib/api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("feedbackClient", () => {
  it("list() GETs /feedback with no filters given", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await feedbackClient.list();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/feedback");
  });

  it("list() GETs /feedback with q/topic/status/sort/page/limit query params", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 3,
    });
    await feedbackClient.list({
      q: "x",
      topic: "bug",
      status: "new",
      sort: "top",
      page: 2,
      limit: 3,
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/feedback?q=x&topic=bug&status=new&sort=top&page=2&limit=3",
    );
  });

  it("listComments() GETs /feedback/:id/comments with page/limit query params", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    await feedbackClient.listComments("id", { page: 1, limit: 10 });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/feedback/id/comments?page=1&limit=10",
    );
  });
});
