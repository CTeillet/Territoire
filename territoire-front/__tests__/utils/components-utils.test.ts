import { describe, it, expect } from "vitest";
import { formatPhoneNumber, getBadgeColor } from "@/components/utils";

describe("components utils", () => {
  describe("formatPhoneNumber", () => {
    it("should format a French 10-digit phone number with spaces", () => {
      expect(formatPhoneNumber("0612345678")).toBe("06 12 34 56 78");
      expect(formatPhoneNumber("0145892310")).toBe("01 45 89 23 10");
    });
  });

  describe("getBadgeColor", () => {
    it("should return the correct color class for each TerritoryStatus", () => {
      expect(getBadgeColor("AVAILABLE")).toBe("bg-purple-500");
      expect(getBadgeColor("ASSIGNED")).toBe("bg-green-500");
      expect(getBadgeColor("LATE")).toBe("bg-pink-500");
      expect(getBadgeColor("PENDING")).toBe("bg-blue-500");
      expect(getBadgeColor("UNKNOWN" as any)).toBe("bg-gray-500");
    });
  });
});
