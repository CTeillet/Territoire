import { describe, it, expect, beforeEach } from "vitest";
import authReducer, { login, logout } from "@/store/slices/auth-slice";
import { User } from "@/models/user";

describe("auth slice", () => {
  const dummyUser: User = {
    id: "user-123",
    email: "test@example.com",
    username: "testuser",
    role: "ADMIN",
  };

  beforeEach(() => {
    // Clear cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("should return initial state", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual({
      user: null,
      token: null,
    });
  });

  it("should handle login and persist to cookies", () => {
    const state = authReducer(
      { user: null, token: null },
      login({ user: dummyUser, token: "jwt-token-xyz" })
    );

    expect(state.user).toEqual(dummyUser);
    expect(state.token).toBe("jwt-token-xyz");
    expect(document.cookie).toContain("token=jwt-token-xyz");
  });

  it("should handle logout and clear state and cookies", () => {
    const loggedInState = {
      user: dummyUser,
      token: "jwt-token-xyz",
    };

    const state = authReducer(loggedInState, logout());

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
