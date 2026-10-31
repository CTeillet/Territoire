import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";
import { Role } from "@/models/role";
import { User } from "@/models/user";
import { RegisterRequest } from "@/models/registerRequest";

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
export const fetchUsersThunk = createAsyncThunk<
  User[],
  void,
  { rejectValue: string }
>("users/fetchUsers", async (_, { rejectWithValue }) => {
  const response = await authFetch(BASE_URL);
  if (!response.ok)
    return rejectWithValue("Erreur lors du chargement des utilisateurs");
  return response.json();
});

// Création d'un utilisateur
export const createUserThunk = createAsyncThunk<
  User,
  RegisterRequest,
  { rejectValue: string }
>("users/createUser", async (user, { rejectWithValue }) => {
  const response = await authFetch("/api/utilisateurs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!response.ok)
    return rejectWithValue(
      await apiErrorMessage(
        response,
        "Erreur lors de la création de l'utilisateur"
      )
    );
  return response.json();
});

// Mise à jour du rôle d’un utilisateur
export const updateUserRoleThunk = createAsyncThunk<
  User,
  { id: string; role: Role },
  { rejectValue: string }
>("users/updateUserRole", async ({ id, role }, { rejectWithValue }) => {
  const response = await authFetch(`${BASE_URL}/${id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  // Le serveur refuse de rétrograder le dernier administrateur : on remonte son motif
  if (!response.ok)
    return rejectWithValue(
      await apiErrorMessage(response, "Erreur lors de la mise à jour du rôle")
    );
  return response.json();
});

// Réinitialisation du mot de passe d’un utilisateur (le serveur révoque ses sessions)
export const resetUserPasswordThunk = createAsyncThunk<
  void,
  { id: string; password: string },
  { rejectValue: string }
>("users/resetUserPassword", async ({ id, password }, { rejectWithValue }) => {
  const response = await authFetch(`${BASE_URL}/${id}/mot-de-passe`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok)
    return rejectWithValue(
      await apiErrorMessage(
        response,
        "Erreur lors de la réinitialisation du mot de passe"
      )
    );
});

// Suppression d’un utilisateur
export const deleteUserThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("users/deleteUser", async (id, { rejectWithValue }) => {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "DELETE" });

  if (!response.ok)
    return rejectWithValue(
      await apiErrorMessage(
        response,
        "Erreur lors de la suppression de l'utilisateur"
      )
    );
  return id; // Retourne l'ID supprimé
});

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
