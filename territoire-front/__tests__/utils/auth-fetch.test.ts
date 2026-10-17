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

  it("should share a single refresh between concurrent requests", async () => {
    document.cookie = "token=old-token";
    let finishRefresh!: (r: Response) => void;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/authentification/refresh") {
        return new Promise<Response>((resolve) => (finishRefresh = resolve));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return Promise.resolve({
        status: auth === "Bearer new-token" ? 200 : 401,
        ok: auth === "Bearer new-token",
      } as Response);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const first = authFetch("/api/a");
    const second = authFetch("/api/b");
    await vi.waitFor(() => expect(finishRefresh).toBeDefined());
    await new Promise((r) => setTimeout(r, 0)); // la seconde requête attend le renouvellement en cours
    finishRefresh({
      status: 200,
      ok: true,
      json: async () => ({ token: "new-token" }),
    } as Response);

    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect(
      fetchMock.mock.calls.filter(
        ([url]) => url === "/api/authentification/refresh"
      )
    ).toHaveLength(1);
  });

  it.each([
    [
      "the refresh response has no token",
      () =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({}),
        } as Response),
    ],
    [
      "the refresh request fails",
      () => Promise.reject(new TypeError("Failed to fetch")),
    ],
  ])("should give up when %s", async (_, refresh) => {
    document.cookie = "token=expired-token";
    const fetchMock = vi.fn((url: string) =>
      url === "/api/authentification/refresh"
        ? refresh()
        : Promise.resolve({ status: 401, ok: false } as Response)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await authFetch("/api/protected");

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(document.cookie).not.toContain("token=expired-token");
  });

  it("should not refresh on a 401 from the authentication endpoints (bad credentials)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 401, ok: false } as Response);
    global.fetch = fetchMock;

    const res = await authFetch("/api/authentification/connexion", {
      method: "POST",
    });

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should let the browser set the multipart Content-Type for FormData", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 200, ok: true } as Response);
    global.fetch = fetchMock;

    await authFetch("/api/excel", {
      method: "POST",
      body: new FormData(),
      headers: { "X-Test": "1" },
    });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "X-Test": "1" });
  });

  it("should ignore network errors on logout", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(logoutRequest()).resolves.toBeUndefined();
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
