import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {Territory, TerritoryCollection} from "@/models/territory";

type TerritoryState = {
    territoriesGeojson: TerritoryCollection | null,
    selectedTerritory: Territory | null;
    loading: boolean;
    error: string | null;
};

// État initial
const initialState: TerritoryState = {
    territoriesGeojson: null,
    selectedTerritory: null,
    loading: false,
    error: null
};

// Thunk pour récupérer les territoires depuis l'API
// Thunk pour récupérer les territoires en format GeoJSON
export const fetchTerritories = createAsyncThunk<TerritoryCollection>(
    "territories/fetchGeoJson",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/territoires/geojson");
            if (!response.ok) throw new Error("Erreur lors de la récupération des territoires (GeoJSON)");
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Erreur inconnue");
        }
    }
);


// Thunk pour ajouter un territoire via l'API
export const addTerritory = createAsyncThunk(
    "territories/add",
    async ({ name }: { name: string }, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/territoires", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error("Erreur lors de l'ajout du territoire");
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Erreur inconnue");
        }
    }
);

// Thunk pour récupérer un territoire par ID
export const fetchTerritoryById = createAsyncThunk<Territory, string>(
    "territories/fetchById",
    async (id, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/territoires/${id}`);
            if (!response.ok) throw new Error("Erreur lors de la récupération du territoire");
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Erreur inconnue");
        }
    }
);

const territorySlice = createSlice({
    name: "territories",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Récupération des territoires en GeoJSON
            .addCase(fetchTerritories.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTerritories.fulfilled, (state, action) => {
                state.territoriesGeojson = action.payload;
                state.loading = false;
            })
            .addCase(fetchTerritories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Ajout d'un territoire
            .addCase(addTerritory.fulfilled, (state, action) => {
                // L'API /api/territoires ne retourne pas un GeoJSON directement, il faudra refaire un fetch.
                // Ici, on garde simplement la cohérence de l'état.
                if (state.territoriesGeojson) {
                    state.territoriesGeojson.features.push({
                        type: "Feature",
                        properties: {
                            id: action.payload.id,
                            name: action.payload.name,
                            status: action.payload.status,
                            lastModifiedDate: new Date().toISOString(),
                            city: "",
                            addressNotToDo: [],
                            geojson: {
                                type: "FeatureCollection",
                                features: [],
                            },
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: [], // À voir comment gérer la géométrie
                        },
                    });
                }
            })
            .addCase(addTerritory.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(fetchTerritoryById.pending, (state) => {
                state.loading = true;
                state.selectedTerritory = null;
                state.error = null;
            })
            .addCase(fetchTerritoryById.fulfilled, (state, action) => {
                state.selectedTerritory = action.payload;
                state.loading = false;
            })
            .addCase(fetchTerritoryById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export du reducer
export default territorySlice.reducer;
