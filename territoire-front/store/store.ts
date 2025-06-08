"use client"

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import personReducer from './slices/person-slice';
import territoryReducer from './slices/territory-slice';
import userReducer from './slices/user-slice';
import cityReducer from './slices/city-slice';
import campaignReducer from './slices/campaign-slice';
import statisticsReducer from './slices/statistics-slice';
import authReducer, {login} from './slices/auth-slice';

export const store = configureStore({
    reducer: {
        persons: personReducer,
        territories: territoryReducer,
        auth: authReducer,
        users: userReducer,
        cities: cityReducer,
        campaigns: campaignReducer,
        statistics: statisticsReducer,
    },
});

// ⚠️ Vérifier si on est côté client avant d'utiliser les cookies
if (typeof window !== "undefined") {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

    const userCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1];

    if (token && userCookie) {
        try {
            const user = JSON.parse(decodeURIComponent(userCookie));
            store.dispatch(login({ user, token }));
        } catch (e) {
            console.error("Erreur lors du parsing des données utilisateur:", e);
        }
    }
}

// Types pour Redux avec TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks personnalisés pour éviter d'importer RootState et Dispatch partout
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
