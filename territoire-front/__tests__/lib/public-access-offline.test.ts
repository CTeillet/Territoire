import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOfflineView,
  isOfflineResponse,
  keepPageForOffline,
  readOfflineView,
  saveOfflineView,
} from "@/lib/public-access-offline";
import { PublicAccess } from "@/models/person-access";

const data: PublicAccess = {
  firstName: "Jean",
  territories: [],
  cities: [],
  pendingRequest: null,
};

describe("vue gardée de la page personnelle", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("garde la dernière vue par lien et la relit avec sa date", () => {
    const savedAt = new Date("2026-11-04T09:30:00Z");
    saveOfflineView("jeton-1", data, savedAt);

    expect(readOfflineView("jeton-1", savedAt)).toEqual({
      data,
      savedAt: "2026-11-04T09:30:00.000Z",
    });
    expect(readOfflineView("jeton-2", savedAt)).toBeNull();

    clearOfflineView("jeton-1");
    expect(readOfflineView("jeton-1", savedAt)).toBeNull();
  });

  it("oublie une vue de plus de 60 jours", () => {
    saveOfflineView("jeton", data, new Date("2026-08-01T00:00:00Z"));

    expect(
      readOfflineView("jeton", new Date("2026-09-15T00:00:00Z"))
    ).not.toBeNull();
    expect(readOfflineView("jeton", new Date("2026-11-04T00:00:00Z"))).toBe(
      null
    );
    expect(localStorage.length).toBe(0);
  });

  it("ignore une vue illisible et un stockage indisponible", () => {
    localStorage.setItem("tms-mes-territoires:jeton", "{pas du json");
    expect(readOfflineView("jeton")).toBeNull();
    localStorage.setItem(
      "tms-mes-territoires:jeton",
      JSON.stringify({ data, savedAt: "pas une date" })
    );
    expect(readOfflineView("jeton")).toBeNull();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveOfflineView("autre", data)).not.toThrow();
  });

  it("reconnaît la réponse du service worker sans réseau, pas une vraie erreur 503", () => {
    const response = (headers: Record<string, string>) =>
      new Response(null, { status: 503, headers });
    expect(isOfflineResponse(response({ "X-Hors-Ligne": "1" }))).toBe(true);
    expect(isOfflineResponse(response({}))).toBe(false);
  });
});

describe("keepPageForOffline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it("demande au service worker de garder la page et ses fichiers de Next.js", async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ active: { postMessage } }) },
      configurable: true,
    });
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { name: `${location.origin}/_next/static/chunks/a.js` },
      { name: `${location.origin}/_next/static/chunks/a.js` },
      { name: `${location.origin}/_next/static/media/police.woff2` },
      { name: `${location.origin}/api/public/acces/x` },
      { name: "https://tile.openstreetmap.org/1/2/3.png" },
    ] as PerformanceEntry[]);

    // Appels rapprochés (la page, puis chaque carte) : une seule demande
    keepPageForOffline();
    keepPageForOffline();

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled(), {
      timeout: 2000,
    });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: "GARDER_HORS_LIGNE",
      urls: [
        location.pathname,
        "/_next/static/chunks/a.js",
        "/_next/static/media/police.woff2",
      ],
    });
  });

  it("ne fait rien sans service worker", () => {
    expect(() => keepPageForOffline()).not.toThrow();
  });
});
