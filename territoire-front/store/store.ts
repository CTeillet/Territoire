"use client"

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import personReducer from './slices/person-slice';
import territoryReducer from './slices/territory-slice';
import userReducer from './slices/user-slice';
import authReducer, {login} from './slices/auth-slice';

export const store = configureStore({
    reducer: {
        persons: personReducer,
        territories: territoryReducer,
        auth: authReducer,
        users: userReducer,
    },
});

// ⚠️ Vérifier si on est côté client avant d'utiliser localStorage
if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
        store.dispatch(login({ user: JSON.parse(user), token }));
    }
}

// Types pour Redux avec TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks personnalisés pour éviter d'importer RootState et Dispatch partout
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
