import { describe, it, expect } from "vitest";
import { generatePassword } from "@/utils/password";

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

  it("should generate random passwords", () => {
    const pwd1 = generatePassword(16);
    const pwd2 = generatePassword(16);
    expect(pwd1).not.toBe(pwd2);
  });
});
