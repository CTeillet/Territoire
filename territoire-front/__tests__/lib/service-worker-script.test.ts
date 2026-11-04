import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * public/sw.js chargé dans un faux environnement de service worker : ses gestionnaires sont appelés comme le
 * ferait le navigateur, avec un Cache Storage en mémoire et un réseau simulé.
 */
const source = readFileSync(resolve(__dirname, "../../public/sw.js"), "utf-8");
const ORIGIN = "https://tms.exemple.fr";

type Handler = (event: unknown) => void;

function loadServiceWorker() {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (request: string | Request) =>
    new URL(typeof request === "string" ? request : request.url, ORIGIN).href;
  const openCache = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      put: async (request: string | Request, response: Response) => {
        store.set(keyOf(request), response);
      },
      match: async (request: string | Request) =>
        store.get(keyOf(request))?.clone(),
      addAll: async () => undefined,
    };
  };
  const caches = {
    open: vi.fn(openCache),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: string | Request) => {
      for (const store of stores.values()) {
        const found = store.get(keyOf(request));
        if (found) return found.clone();
      }
      return undefined;
    },
  };
  const fetchMock = vi.fn<(input: string | Request) => Promise<Response>>();
  const self = {
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  new Function("self", "caches", "fetch", "location", "console", source)(
    self,
    caches,
    fetchMock,
    new URL(ORIGIN),
    { log: () => {} }
  );

  /** Requête interceptée : la réponse du service worker, ou `undefined` s'il laisse faire le navigateur. */
  const request = async (
    path: string,
    { mode = "cors", method = "GET" } = {}
  ): Promise<Response | undefined> => {
    let responded: Promise<Response> | undefined;
    const pending: Promise<unknown>[] = [];
    handlers.fetch({
      request: { url: new URL(path, ORIGIN).href, mode, method },
      respondWith: (response: Promise<Response>) => (responded = response),
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    });
    const response = await responded;
    await Promise.all(pending);
    return response;
  };

  const message = async (data: unknown) => {
    const pending: Promise<unknown>[] = [];
    handlers.message({
      data,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    });
    await Promise.all(pending);
  };

  return { request, message, fetchMock, caches };
}

const page = (body: string) =>
  new Response(body, { status: 200, headers: { "Content-Type": "text/html" } });

describe("service worker (public/sw.js)", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  beforeEach(() => {
    sw = loadServiceWorker();
  });

  it("répond sans réseau à l'API par une erreur reconnaissable, en français", async () => {
    sw.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const response = (await sw.request("/api/public/acces/abc"))!;

    expect(response.status).toBe(503);
    expect(response.headers.get("X-Hors-Ligne")).toBe("1");
    expect((await response.json()).error).toBe(
      "Pas de connexion réseau. Réessayez plus tard."
    );
  });

  it("garde la page personnelle à chaque visite et la sert sans réseau", async () => {
    sw.fetchMock.mockResolvedValueOnce(page("<html>v1</html>"));
    const online = (await sw.request("/m/abc", { mode: "navigate" }))!;
    expect(await online.text()).toBe("<html>v1</html>");

    sw.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const offline = (await sw.request("/m/abc", { mode: "navigate" }))!;
    expect(await offline.text()).toBe("<html>v1</html>");

    // Une autre page personnelle (autre jeton) n'est jamais servie à sa place
    sw.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(
      sw.request("/m/autre", { mode: "navigate" })
    ).rejects.toThrow();
  });

  it("ne garde pas les autres pages de l'application", async () => {
    expect(
      await sw.request("/territoires", { mode: "navigate" })
    ).toBeUndefined();
    expect(sw.fetchMock).not.toHaveBeenCalled();
  });

  it("garde, sur demande de la page, ses fichiers puis les sert sans réseau", async () => {
    sw.fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      return new Response(`contenu de ${url}`, { status: 200 });
    });

    await sw.message({
      type: "GARDER_HORS_LIGNE",
      urls: [
        "/m/abc",
        "/_next/static/chunks/page.js",
        // Ignorés : autre origine, autre chemin
        "https://ailleurs.exemple.fr/_next/static/x.js",
        "/api/public/acces/abc",
        42,
      ],
    });

    expect(sw.fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/m/abc",
      "/_next/static/chunks/page.js",
    ]);

    sw.fetchMock.mockReset();
    sw.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const chunk = (await sw.request("/_next/static/chunks/page.js"))!;
    expect(await chunk.text()).toBe("contenu de /_next/static/chunks/page.js");
    const html = (await sw.request("/m/abc", { mode: "navigate" }))!;
    expect(await html.text()).toBe("contenu de /m/abc");
  });

  it("ne retélécharge pas un fichier de Next.js déjà gardé", async () => {
    sw.fetchMock.mockResolvedValue(new Response("x", { status: 200 }));
    const keep = {
      type: "GARDER_HORS_LIGNE",
      urls: ["/m/abc", "/_next/static/chunks/page.js"],
    };

    await sw.message(keep);
    await sw.message(keep);

    // La page, elle, est rafraîchie à chaque fois
    expect(sw.fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/m/abc",
      "/_next/static/chunks/page.js",
      "/m/abc",
    ]);
  });

  it("laisse passer les fichiers de Next.js non gardés par le réseau", async () => {
    sw.fetchMock.mockResolvedValueOnce(new Response("réseau", { status: 200 }));

    const response = (await sw.request("/_next/static/chunks/autre.js"))!;

    expect(await response.text()).toBe("réseau");
  });
});
