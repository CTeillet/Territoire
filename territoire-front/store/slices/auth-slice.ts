import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {User} from "@/models/user";

interface AuthState {
    user: User  | null;
    token: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem("token", action.payload.token); // Stocke dans localStorage
            localStorage.setItem("user", JSON.stringify(action.payload.user)); // Stocke l'utilisateur
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem("token"); // Supprime le token du stockage local
            localStorage.removeItem("user");
        },
    },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
