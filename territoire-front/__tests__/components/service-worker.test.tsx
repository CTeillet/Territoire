import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ServiceWorker from "@/components/service-worker";

const setServiceWorker = (value: unknown) =>
  Object.defineProperty(navigator, "serviceWorker", {
    value,
    configurable: true,
  });

describe("ServiceWorker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // jsdom n'a pas de service worker : on retire le faux
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it("ne provoque pas d'erreur non gérée si l'enregistrement échoue", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setServiceWorker({
      register: vi.fn().mockRejectedValue(new Error("refusé")),
      addEventListener: vi.fn(),
    });

    render(<ServiceWorker />);

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "Service Worker non enregistré",
        expect.any(Error)
      )
    );
  });

  it("active immédiatement une nouvelle version en attente", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const waiting = { postMessage: vi.fn() };
    setServiceWorker({
      register: vi
        .fn()
        .mockResolvedValue({ waiting, addEventListener: vi.fn() }),
      addEventListener: vi.fn(),
    });

    render(<ServiceWorker />);

    await waitFor(() =>
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
    );
  });

  it("ne fait rien sans support des service workers", () => {
    expect(() => render(<ServiceWorker />)).not.toThrow();
  });

  it("active une nouvelle version dès son installation puis recharge la page une seule fois", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      configurable: true,
    });
    const listeners: Record<string, () => void> = {};
    const newWorker = {
      state: "installing",
      postMessage: vi.fn(),
      addEventListener: (_: string, cb: () => void) =>
        (listeners.statechange = cb),
    };
    const registration = {
      waiting: null,
      installing: newWorker,
      addEventListener: (_: string, cb: () => void) =>
        (listeners.updatefound = cb),
    };
    setServiceWorker({
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: (_: string, cb: () => void) =>
        (listeners.controllerchange = cb),
    });

    render(<ServiceWorker />);
    await waitFor(() => expect(listeners.updatefound).toBeDefined());

    listeners.updatefound();
    newWorker.state = "installed";
    listeners.statechange();
    expect(newWorker.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });

    listeners.controllerchange();
    listeners.controllerchange();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
