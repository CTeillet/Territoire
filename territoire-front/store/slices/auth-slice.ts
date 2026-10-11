import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/models/user";
import {
  clearAuthCookies,
  setTokenCookie,
  setUserCookie,
} from "@/utils/auth-fetch";

interface AuthState {
  user: User | null;
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
      // Cookies (Secure en HTTPS, SameSite=Strict). Le jeton d'accès est de courte durée,
      // la session est prolongée par le refresh token HttpOnly.
      setTokenCookie(action.payload.token);
      setUserCookie(action.payload.user);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      clearAuthCookies();
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
