import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {Territory, TerritoryCollection} from "@/models/territory";
import {format} from "date-fns";
import {Assignment} from "@/models/assignment";
import {authFetch} from "@/utils/auth-fetch";
import {AddressNotToDoDto} from "@/models/AddressNotToDoDto";

type TerritoryState = {
    territoriesGeojson: TerritoryCollection | null,
    selectedTerritory: Territory | null;
    loading: boolean;
    updating: boolean;
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

const BASE_URL = `/api/territoires`;

export const extendTerritory = createAsyncThunk(
    "territories/extendTerritory",
    async (territoryId: string, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${territoryId}/prolongation`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            return rejectWithValue(await response.text() || "Erreur lors de la prolongation du territoire");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const returnTerritory = createAsyncThunk(
    "territories/returnTerritory",
    async (territoryId: string, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${territoryId}/retour`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            return rejectWithValue(await response.text() || "Erreur lors du retour du territoire");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const assignTerritory = createAsyncThunk(
    "territories/assignTerritory",
    async ({territoryId, personId}: { territoryId: string; personId: string }, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${territoryId}/attribuer/${personId}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            return rejectWithValue("Erreur lors de l'assignation du territoire");
        }

        try {
            return await response.json() as Assignment;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const deleteTerritory = createAsyncThunk(
    "territories/deleteTerritory",
    async (territoryId: string, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${territoryId}`, {method: "DELETE"});

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la suppression du territoire");
        }

        return territoryId;
    }
);

export const updateTerritory = createAsyncThunk(
    "territories/updateTerritory",
    async (updatedTerritory: Partial<Territory>, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${updatedTerritory.id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                name: updatedTerritory.name,
                note: updatedTerritory.note,
            }),
        });

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la mise à jour du territoire");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchTerritories = createAsyncThunk<TerritoryCollection>(
    "territories/fetchGeoJson",
    async (_, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/geojson`);

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des territoires (GeoJSON)");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const addTerritory = createAsyncThunk(
    "territories/add",
    async ({name, cityId}: { name: string, cityId: string }, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name, cityId: cityId}),
        });

        if (!response.ok) {
            return rejectWithValue("Erreur lors de l'ajout du territoire");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchTerritoryById = createAsyncThunk<Territory, string>(
    "territories/fetchById",
    async (id, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${id}`);

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération du territoire");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const addAddressNotToVisit = createAsyncThunk(
    "territories/addAddressNotToVisit",
    async ({territoryId, address}: { territoryId: string; address: AddressNotToDoDto }, {rejectWithValue}) => {
        try {
            const response = await authFetch(`${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(address),
            });

            if (!response.ok) {
                return rejectWithValue(`Erreur lors de l'ajout de l'adresse : ${response.statusText}`);
            }

            return await response.json(); // Retourne l'adresse ajoutée
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const modifyAddressNotToVisit = createAsyncThunk(
    "territories/modifyAddressNotToVisit",
    async (
        {territoryId, address, addressId}: { territoryId: string; address: AddressNotToDoDto; addressId: string },
        {rejectWithValue}
    ) => {
        try {
            const response = await authFetch(`${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter/${addressId}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(address),
            });

            if (!response.ok) {
                return rejectWithValue(`Erreur lors de la modification de l'adresse : ${response.statusText}`);
            }

            return await response.json(); // Retourne l'adresse modifiée
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const deleteAddressNotToVisit = createAsyncThunk(
    "territories/deleteAddressNotToVisit",
    async ({territoryId, addressId}: { territoryId: string; addressId: string }, {rejectWithValue}) => {
        try {
            const response = await authFetch(`${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter/${addressId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                return rejectWithValue(`Erreur lors de la suppression de l'adresse : ${response.statusText}`);
            }

            return {territoryId, addressId}; // Retourne les IDs pour modifier le state
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
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
                            assignments: [],
                            city: {
                                id: action.payload.city.id,
                                name: action.payload.city.name,
                                zipCode: action.payload.city.zipCode,
                                center: action.payload.city.center,
                            },
                            addressesNotToDo: [],
                            geojson: "",
                            lastVisitedOn: "nouveau",
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
                console.log(" recuperation territoire", state.selectedTerritory.addressesNotToDo)
                console.log(" recuperation territoire2", state.selectedTerritory)
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
                    state.selectedTerritory = null; // Supprime du store sélectionné si c'était lui
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

                const {territory, returnDate} = updatedAssignment;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = state.territoriesGeojson?.features.find(
                    (f) => f.properties.id === territory.territoryId
                );

                if (feature) {
                    feature.properties.status = "PENDING";
                    feature.properties.lastVisitedOn = returnDate
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
            })


            .addCase(addAddressNotToVisit.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(addAddressNotToVisit.fulfilled, (state, action) => {
                state.updating = false;
                if (state.selectedTerritory) {
                    state.selectedTerritory.addressesNotToDo.push(action.payload);
                }
            })
            .addCase(addAddressNotToVisit.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            })

            // Modification d'une adresse à ne pas visiter
            .addCase(modifyAddressNotToVisit.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(modifyAddressNotToVisit.fulfilled, (state, action) => {
                state.updating = false;
                if (state.selectedTerritory) {
                    const index = state.selectedTerritory.addressesNotToDo.findIndex(addr => addr.id === action.payload.id);
                    if (index !== -1) {
                        state.selectedTerritory.addressesNotToDo[index] = action.payload;
                    }
                }
            })
            .addCase(modifyAddressNotToVisit.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            })

            // Suppression d'une adresse à ne pas visiter
            .addCase(deleteAddressNotToVisit.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(deleteAddressNotToVisit.fulfilled, (state, action) => {
                state.updating = false;
                if (state.selectedTerritory) {
                    state.selectedTerritory.addressesNotToDo = state.selectedTerritory.addressesNotToDo.filter(
                        (addr) => addr.id !== action.payload.addressId
                    );
                }
            })
            .addCase(deleteAddressNotToVisit.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            })


            .addCase(extendTerritory.pending, (state) => {
                state.loading = true;
            })
            .addCase(extendTerritory.fulfilled, (state, action) => {
                state.loading = false;
                const updatedAssignment = action.payload;

                if (!state.territoriesGeojson || !updatedAssignment || !updatedAssignment.territory.territoryId) {
                    console.error("❌ Problème : Assignation ou territoireId est undefined", updatedAssignment);
                    return;
                }

                const {territory, returnDate, assignmentDate} = updatedAssignment;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = state.territoriesGeojson?.features.find(
                    (f) => f.properties.id === territory.territoryId
                );

                if (feature) {
                    feature.properties.status = "ASSIGNED";
                    feature.properties.lastVisitedOn = assignmentDate;
                    feature.properties.assignments = [{
                        ...updatedAssignment,
                        returnDate, // Ajout de la date de retour mise à jour
                    }];
                    console.log(`✅ Territoire ${territory.territoryId} retourné et mis à jour dans le store`);
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${territory.territoryId}`);
                }
            })
            .addCase(extendTerritory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

    },
});

// Export du reducer
export default territorySlice.reducer;
