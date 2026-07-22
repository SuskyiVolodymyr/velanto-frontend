// src/shared/lib/admin-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AdminUserList, AuditLogList } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminClient", () => {
  it("listUsers() fetches with no params when filters are empty", async () => {
    const envelope: AdminUserList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.listUsers();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users");
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

  // The staff flag is TRI-state, so `false` must reach the wire as its own
  // filter (exclude staff) — a truthiness check would silently drop it and the
  // Users tab would list staff again.
  it("listUsers() forwards staff=false, not just staff=true", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await adminClient.listUsers({ staff: false });
    expect(apiClient.get).toHaveBeenCalledWith("/admin/users?staff=false");

    await adminClient.listUsers({ staff: true });
    expect(apiClient.get).toHaveBeenCalledWith("/admin/users?staff=true");
  });

  it("auditLogs() fetches with no params when filters are empty", async () => {
    const envelope: AuditLogList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.auditLogs();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs");
  });
});
