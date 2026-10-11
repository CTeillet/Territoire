import { describe, it, expect, vi, beforeEach } from "vitest";
import { authFetch, logoutRequest } from "@/utils/auth-fetch";

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

  it("should not try to refresh the token on 403 (insufficient rights)", async () => {
    document.cookie = "token=valid-token";

    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
    } as Response);
    global.fetch = fetchMock;

    const res = await authFetch("/api/campagnes", { method: "POST" });

    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should clear the session when the refresh fails", async () => {
    document.cookie = "token=expired-token";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false } as Response)
      .mockResolvedValueOnce({ status: 401, ok: false } as Response);
    global.fetch = fetchMock;

    const res = await authFetch("/api/protected");

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(document.cookie).not.toContain("token=expired-token");
  });

  it("should call the logout endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
    } as Response);
    global.fetch = fetchMock;

    await logoutRequest();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/authentification/deconnexion",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });
});
