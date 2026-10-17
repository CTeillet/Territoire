import { describe, it, expect } from "vitest";
import { buildTerritoryPopup } from "@/components/territory/territory-popup";

describe("buildTerritoryPopup", () => {
  it("affiche le nom et le statut traduit", () => {
    const popup = buildTerritoryPopup("t1", "R-12", "LATE");

    expect(popup.querySelector("h2")?.textContent).toBe("R-12");
    expect(popup.querySelector("span")?.textContent).toBe("En retard");
    expect(popup.querySelector("#react-popup-t1")).not.toBeNull();
  });

  it("n'interprète jamais le nom comme du HTML (XSS)", () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const popup = buildTerritoryPopup("t1", malicious, "AVAILABLE");

    expect(popup.querySelector("img")).toBeNull();
    expect(popup.querySelector("h2")?.textContent).toBe(malicious);
  });

  it("affiche le statut brut s'il n'a pas de traduction", () => {
    const popup = buildTerritoryPopup(
      "t1",
      "R-12",
      "INCONNU" as unknown as "AVAILABLE"
    );

    expect(popup.querySelector("span")?.textContent).toBe("INCONNU");
  });
});
