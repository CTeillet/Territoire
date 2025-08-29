import {City} from "@/models/city";
import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {authFetch} from "@/utils/auth-fetch";

// État initial du slice
interface CityState {
    cities: City[];
    loading: boolean;
    error: string | null;
}

const initialState: CityState = {
    cities: [],
    loading: false,
    error: null,
};
const API_URL = "/api/villes";

// ✅ Thunk pour récupérer les villes depuis le backend
export const fetchCities = createAsyncThunk("cities/fetchCities", async () => {
    const response = await authFetch(API_URL);
    if (!response.ok) {
        throw new Error("Erreur lors de la récupération des villes");
    }
    return response.json() as Promise<City[]>;
});

// ✅ Thunk pour ajouter une ville
export const addCity = createAsyncThunk("cities/addCity",
    async ({name, zipCode, colorHex}:{name: string, zipCode: string, colorHex?: string}) => {
        const response = await authFetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name, zipCode: zipCode, colorHex: colorHex}),
        });

        if (!response.ok) {
            throw new Error("Erreur lors de l'ajout de la ville");
        }

        return response.json() as Promise<City>;
    });

// ✅ Thunk pour supprimer une ville
export const removeCity = createAsyncThunk("cities/removeCity", async (id: string) => {
    const response = await authFetch(`${API_URL}/${id}`, {method: "DELETE"});

    if (!response.ok) {
        throw new Error("Erreur lors de la suppression de la ville");
    }

    return id;
});

// ✅ Thunk pour mettre à jour la couleur d'une ville
export const updateCityColor = createAsyncThunk(
    "cities/updateCityColor",
    async ({id, colorHex}: {id: string; colorHex: string | null}) => {
        const response = await authFetch(`${API_URL}/${id}/couleur`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({colorHex}),
        });
        if (!response.ok) {
            throw new Error("Erreur lors de la mise à jour de la couleur");
        }
        return response.json() as Promise<City>;
    }
);

const citySlice = createSlice({
    name: "cities",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // 📌 Gestion de la récupération des villes
            .addCase(fetchCities.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCities.fulfilled, (state, action: PayloadAction<City[]>) => {
                state.loading = false;
                state.cities = action.payload;
            })
            .addCase(fetchCities.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "Erreur lors du chargement des villes";
            })

            // 📌 Gestion de l'ajout d'une ville
            .addCase(addCity.fulfilled, (state, action: PayloadAction<City>) => {
                state.cities.push(action.payload);
            })

            // 📌 Gestion de la suppression d'une ville
            .addCase(removeCity.fulfilled, (state, action: PayloadAction<string>) => {
                state.cities = state.cities.filter(city => city.id !== action.payload);
            })
            // 📌 Gestion de la mise à jour de la couleur
            .addCase(updateCityColor.fulfilled, (state, action: PayloadAction<City>) => {
                const updated = action.payload;
                const idx = state.cities.findIndex(c => c.id === updated.id);
                if (idx !== -1) {
                    state.cities[idx] = updated;
                }
            });
    },
});

export default citySlice.reducer;
