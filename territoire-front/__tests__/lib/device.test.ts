import { describe, it, expect, vi, afterEach } from "vitest";
import { isIOSDevice } from "@/lib/device";
import { IPHONE_USER_AGENT } from "../mocks/ios";

// jsdom n'a pas maxTouchPoints : défini pour chaque appareil
const device = (userAgent: string, maxTouchPoints = 0) => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "maxTouchPoints");
});

describe("device", () => {
  it("reconnaît l'iPhone et l'iPad, y compris l'iPad qui se présente comme un Mac", () => {
    device(IPHONE_USER_AGENT, 5);
    expect(isIOSDevice()).toBe(true);

    device("Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X)", 5);
    expect(isIOSDevice()).toBe(true);

    device("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1", 5);
    expect(isIOSDevice()).toBe(true);
  });

  it("écarte les ordinateurs et Android", () => {
    device("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1", 0);
    expect(isIOSDevice()).toBe(false);

    device("Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/141.0", 5);
    expect(isIOSDevice()).toBe(false);

    device("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0", 10);
    expect(isIOSDevice()).toBe(false);
  });

  it("répond non pendant le rendu serveur, sans navigator", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isIOSDevice()).toBe(false);
  });
});
