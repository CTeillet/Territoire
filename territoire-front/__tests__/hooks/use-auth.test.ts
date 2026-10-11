import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as reactRedux from "react-redux";

vi.mock("react-redux", () => ({
  useSelector: vi.fn(),
}));

describe("useAuth", () => {
  it("should return isAuthenticated false when no token", () => {
    vi.mocked(reactRedux.useSelector).mockImplementation((selector: any) =>
      selector({ auth: { user: null, token: null } })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should return isAuthenticated true when token present", () => {
    const dummyUser = {
      id: "1",
      email: "a@b.com",
      username: "a",
      role: "ADMIN",
    };
    vi.mocked(reactRedux.useSelector).mockImplementation((selector: any) =>
      selector({ auth: { user: dummyUser, token: "token-123" } })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(dummyUser);
  });
});
