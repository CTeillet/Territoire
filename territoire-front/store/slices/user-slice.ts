import { Role } from "@/models/role";
import { User } from "@/models/user";
import { RegisterRequest } from "@/models/registerRequest";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createApiThunk, jsonBody, thunkApi } from "@/utils/thunk-request";

const BASE_URL = "/api/utilisateurs";

// Interface pour l'état Redux

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}
// État initial

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

// 🔹 Thunks pour interagir avec l'API
// Récupération des utilisateurs
export const fetchUsersThunk = createApiThunk(
  "users/fetchUsers",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<User[]>(
      BASE_URL,
      "Erreur lors du chargement des utilisateurs"
    )
);

// Création d'un utilisateur
export const createUserThunk = createApiThunk(
  "users/createUser",
  (user: RegisterRequest, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<User>(
      BASE_URL,
      "Erreur lors de la création de l'utilisateur",
      jsonBody("POST", user)
    )
);

// Mise à jour du rôle d'un utilisateur (le serveur refuse de rétrograder le dernier administrateur)
export const updateUserRoleThunk = createApiThunk(
  "users/updateUserRole",
  ({ id, role }: { id: string; role: Role }, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<User>(
      `${BASE_URL}/${id}/role`,
      "Erreur lors de la mise à jour du rôle",
      jsonBody("PUT", { role })
    )
);

// Réinitialisation du mot de passe d'un utilisateur (le serveur révoque ses sessions)
export const resetUserPasswordThunk = createApiThunk(
  "users/resetUserPassword",
  async (
    { id, password }: { id: string; password: string },
    { rejectWithValue }
  ) => {
    const failure = await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${id}/mot-de-passe`,
      "Erreur lors de la réinitialisation du mot de passe",
      jsonBody("PUT", { password })
    );
    if (failure) return failure;
  }
);

// Suppression d'un utilisateur
export const deleteUserThunk = createApiThunk(
  "users/deleteUser",
  async (id: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${id}`,
      "Erreur lors de la suppression de l'utilisateur",
      { method: "DELETE" }
    )) ?? id
);

// 🔹 Slice Redux
const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUsersThunk.fulfilled,
        (state, action: PayloadAction<User[]>) => {
          state.loading = false;
          state.users = action.payload;
        }
      )
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur inconnue";
      })

      // Create User
      .addCase(
        createUserThunk.fulfilled,
        (state, action: PayloadAction<User>) => {
          state.users.push(action.payload);
        }
      )
      .addCase(createUserThunk.rejected, (state, action) => {
        state.error =
          action.payload || "Erreur lors de la création de l'utilisateur";
      })

      // Update User Role
      .addCase(
        updateUserRoleThunk.fulfilled,
        (state, action: PayloadAction<User>) => {
          const index = state.users.findIndex(
            (user) => user.id === action.payload.id
          );
          if (index !== -1) {
            state.users[index].role = action.payload.role;
          }
        }
      )
      .addCase(updateUserRoleThunk.rejected, (state, action) => {
        state.error = action.payload || "Erreur lors de la mise à jour du rôle";
      })

      // Delete User
      .addCase(
        deleteUserThunk.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.users = state.users.filter(
            (user) => user.id !== action.payload
          );
        }
      )
      .addCase(deleteUserThunk.rejected, (state, action) => {
        state.error =
          action.payload || "Erreur lors de la suppression de l'utilisateur";
      });
  },
});

export default userSlice.reducer;
