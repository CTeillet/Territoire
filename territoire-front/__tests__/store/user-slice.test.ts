import { describe, it, expect, vi, beforeEach } from "vitest";
import userReducer, {
  fetchUsersThunk,
  createUserThunk,
  updateUserRoleThunk,
  deleteUserThunk,
} from "@/store/slices/user-slice";
import { User } from "@/models/user";
import { Role } from "@/models/role";
import * as authFetchModule from "@/utils/auth-fetch";

describe("user slice", () => {
  const dummyUser: User = {
    id: "u-1",
    email: "user@example.com",
    username: "user1",
    role: "UTILISATEUR" as Role,
  };

  const initialState = {
    users: [],
    loading: false,
    error: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(userReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("reducers", () => {
    it("should handle fetchUsersThunk lifecycle", () => {
      const pending = userReducer(initialState, {
        type: fetchUsersThunk.pending.type,
      });
      expect(pending.loading).toBe(true);

      const fulfilled = userReducer(pending, {
        type: fetchUsersThunk.fulfilled.type,
        payload: [dummyUser],
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.users).toEqual([dummyUser]);

      const rejected = userReducer(pending, {
        type: fetchUsersThunk.rejected.type,
        payload: "Erreur fetch",
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur fetch");
    });

    it("should handle createUserThunk lifecycle", () => {
      const fulfilled = userReducer(initialState, {
        type: createUserThunk.fulfilled.type,
        payload: dummyUser,
      });
      expect(fulfilled.users).toContainEqual(dummyUser);

      const rejected = userReducer(initialState, {
        type: createUserThunk.rejected.type,
        payload: "Erreur création",
      });
      expect(rejected.error).toBe("Erreur création");
    });

    it("should handle updateUserRoleThunk lifecycle", () => {
      const stateWithUser = { ...initialState, users: [dummyUser] };
      const updatedUser: User = { ...dummyUser, role: "ADMIN" as Role };

      const fulfilled = userReducer(stateWithUser, {
        type: updateUserRoleThunk.fulfilled.type,
        payload: updatedUser,
      });
      expect(fulfilled.users[0].role).toBe("ADMIN");

      const rejected = userReducer(stateWithUser, {
        type: updateUserRoleThunk.rejected.type,
        payload: "Erreur rôle",
      });
      expect(rejected.error).toBe("Erreur rôle");
    });

    it("should handle deleteUserThunk lifecycle", () => {
      const stateWithUser = { ...initialState, users: [dummyUser] };
      const fulfilled = userReducer(stateWithUser, {
        type: deleteUserThunk.fulfilled.type,
        payload: "u-1",
      });
      expect(fulfilled.users).toHaveLength(0);

      const rejected = userReducer(stateWithUser, {
        type: deleteUserThunk.rejected.type,
        payload: "Erreur suppression",
      });
      expect(rejected.error).toBe("Erreur suppression");
    });
  });

  describe("thunks execution", () => {
    it("fetchUsersThunk should fetch and return users", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [dummyUser],
      } as Response);

      const dispatch = vi.fn();
      const thunk = fetchUsersThunk();
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toEqual([dummyUser]);
    });

    it("createUserThunk should post and return new user", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => dummyUser,
      } as Response);

      const dispatch = vi.fn();
      const thunk = createUserThunk({
        email: "user@example.com",
        username: "user1",
        password: "secretpassword",
        role: "ADMIN" as Role,
      });
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toEqual(dummyUser);
    });

    it("deleteUserThunk should delete and return id", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
      } as Response);

      const dispatch = vi.fn();
      const thunk = deleteUserThunk("u-1");
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toBe("u-1");
    });
  });
});
