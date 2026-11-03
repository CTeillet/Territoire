import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isNativeLabelPrintingEnabled,
  nativeAssignmentLabelURL,
  setNativeLabelPrintingEnabled,
} from "@/lib/iphone-label-printer";

const assignment = {
  person: { id: "p1", firstName: "Élodie & Jean +", lastName: "Smith" },
  dueDate: "2028-02-29T00:00:00+14:00",
};
const requestID = "24f49820-801c-4f63-bbd9-526cab9e6743";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Impression iPhone native", () => {
  it("produit le format partagé avec le parseur Swift, sans décalage de date ni données de compte", () => {
    expect(nativeAssignmentLabelURL(assignment, requestID)).toBe(
      `tmsprint://print?v=1&id=${requestID}&name=%C3%89lodie%20%26%20Jean%20%2B%20S.&dueDate=2028-02-29`
    );
    const url = new URL(nativeAssignmentLabelURL(assignment, requestID)!);
    expect([...url.searchParams.keys()]).toEqual([
      "v",
      "id",
      "name",
      "dueDate",
    ]);
    expect(url.searchParams.get("name")).toBe("Élodie & Jean + S.");
    expect(url.searchParams.get("name")).not.toContain("Smith");
  });

  it("ne crée pas d'étiquette pour une campagne et refuse les textes trop longs", () => {
    expect(
      nativeAssignmentLabelURL({ ...assignment, person: undefined }, requestID)
    ).toBeNull();
    expect(() =>
      nativeAssignmentLabelURL(
        {
          ...assignment,
          person: { ...assignment.person, firstName: "a".repeat(129) },
        },
        requestID
      )
    ).toThrow();
  });

  it("garde le parcours LBX par défaut et en l'absence de stockage local", () => {
    expect(isNativeLabelPrintingEnabled()).toBe(false);
    expect(setNativeLabelPrintingEnabled(true)).toBe(true);
    expect(isNativeLabelPrintingEnabled()).toBe(true);
    setNativeLabelPrintingEnabled(false);
    expect(isNativeLabelPrintingEnabled()).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Bloqué");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Bloqué");
    });
    expect(isNativeLabelPrintingEnabled()).toBe(false);
    expect(setNativeLabelPrintingEnabled(true)).toBe(false);
  });
});
