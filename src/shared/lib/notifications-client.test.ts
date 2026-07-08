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
    mockedApiClient.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    await notificationsClient.list();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications");
  });

  it("list() serializes page/limit into the query string", async () => {
    mockedApiClient.get.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5 });
    await notificationsClient.list({ page: 2, limit: 5 });
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications?page=2&limit=5");
  });

  it("unreadCount() calls GET /notifications/unread-count", async () => {
    mockedApiClient.get.mockResolvedValue({ count: 3 });
    await notificationsClient.unreadCount();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications/unread-count");
  });

  it("markRead() calls POST /notifications/:id/read", async () => {
    mockedApiClient.post.mockResolvedValue({});
    await notificationsClient.markRead("n1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/notifications/n1/read");
  });

  it("markAllRead() calls POST /notifications/read-all", async () => {
    mockedApiClient.post.mockResolvedValue({ updated: 2 });
    await notificationsClient.markAllRead();
    expect(mockedApiClient.post).toHaveBeenCalledWith("/notifications/read-all");
  });

  it("getPreferences() calls GET /notifications/preferences", async () => {
    mockedApiClient.get.mockResolvedValue({});
    await notificationsClient.getPreferences();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications/preferences");
  });

  it("setPreferences() calls PATCH /notifications/preferences with the given updates", async () => {
    mockedApiClient.patch.mockResolvedValue({});
    await notificationsClient.setPreferences({ new_comment: false });
    expect(mockedApiClient.patch).toHaveBeenCalledWith("/notifications/preferences", {
      new_comment: false,
    });
  });
});
