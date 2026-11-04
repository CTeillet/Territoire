import { describe, it, expect } from "vitest";
import { formatPhoneNumber, phoneMatches } from "@/components/utils";

describe("components utils", () => {
  describe("formatPhoneNumber", () => {
    it("should format a French 10-digit phone number with spaces", () => {
      expect(formatPhoneNumber("0612345678")).toBe("06 12 34 56 78");
      expect(formatPhoneNumber("0145892310")).toBe("01 45 89 23 10");
    });

    it("should group an international number by its country", () => {
      expect(formatPhoneNumber("+33612345678")).toBe("+33 6 12 34 56 78");
      expect(formatPhoneNumber("+447911123456")).toBe("+44 7911 123456");
    });
  });

  describe("phoneMatches", () => {
    it("should match a search typed with or without country code or spaces", () => {
      expect(phoneMatches("+33612345678", "06 12 34")).toBe(true);
      expect(phoneMatches("+33612345678", "0612")).toBe(true);
      expect(phoneMatches("+33612345678", "+33 6 12")).toBe(true);
      expect(phoneMatches("+33612345678", "56.78")).toBe(true);
      expect(phoneMatches("0612345678", "06 12")).toBe(true);
      expect(phoneMatches("+447911123456", "07911")).toBe(true);
    });

    it("should not match other numbers, text or an empty search", () => {
      expect(phoneMatches("+33612345678", "0699")).toBe(false);
      expect(phoneMatches("+33612345678", "jean")).toBe(false);
      expect(phoneMatches("+33612345678", "jean 06")).toBe(false);
      expect(phoneMatches("+33612345678", " + ")).toBe(false);
    });
  });
});
