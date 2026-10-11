import { describe, it, expect, vi } from "vitest";
import { generatePassword, PASSWORD_MIN_LENGTH } from "@/utils/password";

describe("generatePassword", () => {
  it("should generate a password of default length 12", () => {
    const pwd = generatePassword();
    expect(pwd).toBeDefined();
    expect(pwd).toHaveLength(12);
  });

  it("should generate a password of custom length", () => {
    const pwd = generatePassword(20);
    expect(pwd).toHaveLength(20);
  });

  it("should satisfy the backend minimum length by default", () => {
    expect(generatePassword().length).toBeGreaterThanOrEqual(
      PASSWORD_MIN_LENGTH
    );
  });

  it("should use the cryptographic random generator", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    generatePassword(16);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should only use characters from the allowed charset", () => {
    const allowed = /^[A-Za-z0-9!@#$%^&*()_+[\]{}|;:,.<>?]+$/;
    for (let i = 0; i < 20; i++) {
      expect(generatePassword(32)).toMatch(allowed);
    }
  });

  it("should generate random passwords", () => {
    const pwd1 = generatePassword(16);
    const pwd2 = generatePassword(16);
    expect(pwd1).not.toBe(pwd2);
  });
});
