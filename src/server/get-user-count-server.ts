const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch of the public registered-user count (backend
 * `GET /users/count`) for the auth brand panel's social-proof line. Returns
 * `null` on any failure so the panel renders without the number rather than
 * breaking the page — e.g. before the backend endpoint is deployed. Cached
 * briefly: the count moves slowly and this is marketing chrome, not per-request
 * data, so there's no reason to hit the backend on every auth page view.
 */
export async function getUserCountServer(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/users/count`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: unknown };
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}
