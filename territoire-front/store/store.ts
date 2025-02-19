import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import personReducer from './slices/person-slice';

export const store = configureStore({
    reducer: {
        persons: personReducer,
    },
});

// Types pour Redux avec TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks personnalisés pour éviter d'importer RootState et Dispatch partout
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
