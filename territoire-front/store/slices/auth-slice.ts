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
            // Stocke dans les cookies au lieu de localStorage
            // Persist cookies for 30 days so the user stays logged in across browser restarts
            document.cookie = `token=${action.payload.token}; Path=/; Max-Age=2592000; SameSite=Lax`;
            document.cookie = `user=${encodeURIComponent(JSON.stringify(action.payload.user))}; Path=/; Max-Age=2592000; SameSite=Lax`;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            // Supprime les cookies au lieu de localStorage
            document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        },
    },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
