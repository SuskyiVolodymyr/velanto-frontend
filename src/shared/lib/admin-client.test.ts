// src/shared/lib/admin-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import type {
  AdminOverview,
  AdminUserList,
  AuditLogList,
} from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminClient", () => {
  it("overview() fetches /admin/overview with no params", async () => {
    const overview: AdminOverview = {
      registeredUsers: 10,
      packs: 5,
      plays: 20,
      onlineUsers: null,
      pendingReports: 3,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 0,
      playsLast7Days: [],
      topPacksToday: [],
    };
    vi.mocked(apiClient.get).mockResolvedValue(overview);

    const result = await adminClient.overview();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/overview");
    expect(result).toEqual(overview);
  });

  it("listUsers() fetches with no params when filters are empty", async () => {
    const envelope: AdminUserList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.listUsers();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users");
  });

  it("listUsers() forwards q, page, and limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
    });

    await adminClient.listUsers({ q: "alice", page: 2, limit: 20 });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/users?q=alice&page=2&limit=20",
    );
  });

  it("listUsers() forwards only page when q and limit are absent", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
    });

    await adminClient.listUsers({ page: 2 });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users?page=2");
  });

  it("listUsers() forwards page 0 (falsy but a valid page value)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      limit: 20,
    });

    await adminClient.listUsers({ page: 0 });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users?page=0");
  });

  it("auditLogs() fetches with no params when filters are empty", async () => {
    const envelope: AuditLogList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.auditLogs();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs");
  });

  it("auditLogs() forwards actor, action, target, page, and limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await adminClient.auditLogs({
      actor: "u1",
      action: "ban_user",
      target: "u2",
      page: 1,
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/audit-logs?actor=u1&action=ban_user&target=u2&page=1&limit=20",
    );
  });

  it("auditLogs() forwards only action when actor and target are absent", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await adminClient.auditLogs({ action: "ban_user" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/audit-logs?action=ban_user",
    );
  });
});
