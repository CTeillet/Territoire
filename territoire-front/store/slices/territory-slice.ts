import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {Territory, TerritoryCollection} from "@/models/territory";
import {format} from "date-fns";
import {Assignment} from "@/models/assignment";

type TerritoryState = {
    territoriesGeojson: TerritoryCollection | null,
    selectedTerritory: Territory | null;
    loading: boolean;
    updating:boolean;
    error: string | null;
};

// État initial
const initialState: TerritoryState = {
    territoriesGeojson: null,
    selectedTerritory: null,
    loading: false,
    updating: false,
    error: null
};

export const returnTerritory = createAsyncThunk(
    "territories/returnTerritory",
    async (territoryId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/territoires/${territoryId}/retour`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(await response.text() || "Erreur lors du retour du territoire");
            }


             // On récupère l'`Assignment` mis à jour
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// ✅ Action asynchrone pour assigner un territoire
export const assignTerritory = createAsyncThunk(
    "territories/assignTerritory",
    async ({ territoryId, personId }: { territoryId: string; personId: string }, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/territoires/${territoryId}/attribuer/${personId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Erreur lors de l'assignation du territoire");
            }

            const assignment: Assignment = await response.json();
            return assignment; // On retourne l'objet Assignment récupéré depuis le backend
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteTerritory = createAsyncThunk(
    "territories/deleteTerritory",
    async (territoryId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/territoires/${territoryId}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Erreur lors de la suppression du territoire");

            return territoryId; // On retourne l'ID pour le supprimer du store
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);


// ✅ Action asynchrone pour mettre à jour un territoire
export const updateTerritory = createAsyncThunk(
    "territories/updateTerritory",
    async (updatedTerritory: Partial<Territory>, { rejectWithValue}) => {
        try {
            const response = await fetch(`/api/territoires/${updatedTerritory.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: updatedTerritory.name,
                    city: updatedTerritory.city,
                    note: updatedTerritory.note,
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de la mise à jour du territoire");

            // ✅ Si la mise à jour réussit, on récupère le territoire à jour
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Thunk pour récupérer les territoires depuis l'API en format GeoJSON
export const fetchTerritories = createAsyncThunk<TerritoryCollection>(
    "territories/fetchGeoJson",
    async (_, {rejectWithValue}) => {
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
    async ({name}: { name: string }, {rejectWithValue}) => {
        try {
            const response = await fetch("/api/territoires", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name}),
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
    async (id, {rejectWithValue}) => {
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
                            geojson: "",
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
            })

            .addCase(updateTerritory.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(updateTerritory.fulfilled, (state, action) => {
                state.updating = false;
                if (state.selectedTerritory && state.selectedTerritory.id === action.payload.id) {
                    state.selectedTerritory = {
                        ...state.selectedTerritory,
                        ...action.payload,
                        lastModifiedDate: format(new Date(), "yyyy-MM-dd"), // ✅ Format YYYY-MM-DD
                    };
                }
            })
            .addCase(updateTerritory.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            })

            .addCase(deleteTerritory.fulfilled, (state, action) => {
                if (state.territoriesGeojson) {
                    state.territoriesGeojson.features = state.territoriesGeojson.features.filter(
                        (territory) => territory.properties.id !== action.payload
                    );
                }

                if (state.selectedTerritory?.id === action.payload) {
                    state.selectedTerritory = null; // Supprime du state sélectionné si c'était lui
                }
            })

            .addCase(assignTerritory.pending, (state) => {
                state.loading = true;
            })
            .addCase(assignTerritory.fulfilled, (state, action) => {
                state.loading = false;
                const assignment = action.payload;


                if (!state.territoriesGeojson || !assignment || !assignment.territory.territoryId) {
                    console.error("❌ Problème : l'assignation ou le territoireId est undefined", assignment);
                    return;
                }

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = state.territoriesGeojson?.features.find(
                    (f) => f.properties.id === assignment.territory.territoryId
                );

                if (feature) {
                    feature.properties.status = "ASSIGNED";
                    feature.properties.assignments = [assignment]; // Remplace l'assignation existante par la nouvelle
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${assignment.territory.territoryId}`);
                }
            })
            .addCase(assignTerritory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            .addCase(returnTerritory.pending, (state) => {
                state.loading = true;
            })
            .addCase(returnTerritory.fulfilled, (state, action) => {
                state.loading = false;
                const updatedAssignment = action.payload;

                if (!state.territoriesGeojson || !updatedAssignment || !updatedAssignment.territory.territoryId) {
                    console.error("❌ Problème : Assignation ou territoireId est undefined", updatedAssignment);
                    return;
                }

                const { territory, returnDate } = updatedAssignment;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = state.territoriesGeojson?.features.find(
                    (f) => f.properties.id === territory.territoryId
                );

                if (feature) {
                    feature.properties.status = "PENDING";
                    feature.properties.assignments = [{
                        ...updatedAssignment,
                        returnDate, // Ajout de la date de retour mise à jour
                    }];
                    console.log(`✅ Territoire ${territory.territoryId} retourné et mis à jour dans le store`);
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${territory.territoryId}`);
                }
            })
            .addCase(returnTerritory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export du reducer
export default territorySlice.reducer;
