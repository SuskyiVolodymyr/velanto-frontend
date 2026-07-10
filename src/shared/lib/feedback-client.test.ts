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

  it("getById() GETs /feedback/:id", async () => {
    mockedApiClient.get.mockResolvedValue({ id: "id" });
    await feedbackClient.getById("id");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/feedback/id");
  });

  it("create() POSTs to /feedback", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "f1" });
    const input = {
      topic: "bug" as const,
      title: "Title",
      body: "Body",
      visibility: "everyone" as const,
    };
    await feedbackClient.create(input);
    expect(mockedApiClient.post).toHaveBeenCalledWith("/feedback", input);
  });

  it("setStatus() PATCHes /feedback/:id/status", async () => {
    mockedApiClient.patch.mockResolvedValue({ id: "id", status: "done" });
    await feedbackClient.setStatus("id", "done");
    expect(mockedApiClient.patch).toHaveBeenCalledWith("/feedback/id/status", {
      status: "done",
    });
  });

  it("remove() DELETEs /feedback/:id", async () => {
    mockedApiClient.delete.mockResolvedValue(undefined);
    await feedbackClient.remove("id");
    expect(mockedApiClient.delete).toHaveBeenCalledWith("/feedback/id");
  });

  it("vote() POSTs to /feedback/:id/vote", async () => {
    mockedApiClient.post.mockResolvedValue({
      score: 1,
      likes: 1,
      dislikes: 0,
      myVote: 1,
    });
    await feedbackClient.vote("id", 1);
    expect(mockedApiClient.post).toHaveBeenCalledWith("/feedback/id/vote", {
      value: 1,
    });
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

  it("listComments() GETs /feedback/:id/comments with no filters given", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await feedbackClient.listComments("id");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/feedback/id/comments");
  });

  it("addComment() POSTs to /feedback/:id/comments", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "c1" });
    await feedbackClient.addComment("id", { body: "hi" });
    expect(mockedApiClient.post).toHaveBeenCalledWith("/feedback/id/comments", {
      body: "hi",
    });
  });
});
