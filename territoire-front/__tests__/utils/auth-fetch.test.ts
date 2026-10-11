import { describe, it, expect, vi, beforeEach } from "vitest";
import { authFetch } from "@/utils/auth-fetch";

describe("authFetch", () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    vi.restoreAllMocks();
  });

  it("should make fetch request without auth token when cookie absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    } as Response);
    global.fetch = fetchMock;

    await authFetch("/api/test");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
    );
  });

  it("should attach Bearer token when cookie present", async () => {
    document.cookie = "token=secret-jwt-123";

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    } as Response);
    global.fetch = fetchMock;

    await authFetch("/api/protected");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/protected",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-jwt-123",
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("should retry with new token if receiving 401 and refresh succeeds", async () => {
    document.cookie = "token=old-token";

    const fetchMock = vi
      .fn()
      // First call -> 401
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      } as Response)
      // Refresh call -> 200 with new token
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ token: "new-refreshed-token" }),
      } as Response)
      // Retry call -> 200
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
      } as Response);

    global.fetch = fetchMock;

    const res = await authFetch("/api/protected");

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
