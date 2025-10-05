import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {Territory, TerritoryCollection} from "@/models/territory";
import {format} from "date-fns";
import {Assignment} from "@/models/assignment";
import {authFetch} from "@/utils/auth-fetch";
import {AddressNotToDoDto} from "@/models/AddressNotToDoDto";
import {UpdateTerritoryDto} from "@/models/update-territory-dto";
import {TerritoryStatusHistoryDto} from "@/models/territory-status-history";

interface TerritoryDistribution {
    cityName: string;
    territoryCount: number;
    percentage: number;
}

interface AverageAssignmentDuration {
    period: string;
    averageDuration: number;
}

type TerritoryState = {
    territoriesGeojson: TerritoryCollection | null,
    selectedTerritory: Territory | null;
    loading: boolean;
    updating: boolean;
    error: string | null;
    // Statistics state
    territoryStatusHistory: TerritoryStatusHistoryDto[];
    territoriesNotAssignedSince: number;
    averageAssignmentDurationByMonth: AverageAssignmentDuration[];
    overallAverageAssignmentDuration: number | null;
    territoryDistributionByCity: TerritoryDistribution[];
    latestAssignments: Assignment[];
    statisticsLoading: boolean;
};

// État initial
const initialState: TerritoryState = {
    territoriesGeojson: null,
    selectedTerritory: null,
    loading: false,
    updating: false,
    error: null,
    // Statistics initial state
    territoryStatusHistory: [],
    territoriesNotAssignedSince: 0,
    averageAssignmentDurationByMonth: [],
    overallAverageAssignmentDuration: null,
    territoryDistributionByCity: [],
    latestAssignments: [],
    statisticsLoading: false
};

const BASE_URL = `/api/territoires`;

// --- Small helpers to reduce duplication inside reducers ---
const findFeatureById = (state: TerritoryState, id: string) => {
    return state.territoriesGeojson?.features.find((f) => f.properties.id === id);
};

const updateSelectedIfSame = (state: TerritoryState, affectedId: string, updater: (t: Territory) => void) => {
    if (state.selectedTerritory && state.selectedTerritory.id === affectedId) {
        updater(state.selectedTerritory);
    }
};

export const extendTerritory = createAsyncThunk(
    "territories/extendTerritory",
    async ({ territoryId, dueDate }: { territoryId: string; dueDate?: string }, {rejectWithValue}) => {
        // Construct URL with query parameter if dueDate is provided
        let url = `${BASE_URL}/${territoryId}/prolongation`;
        if (dueDate) {
            url += `?dueDate=${dueDate}`;
        }

        const response = await authFetch(url, {
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

export const cancelAssignment = createAsyncThunk(
    "territories/cancelAssignment",
    async (territoryId: string, {rejectWithValue}) => {
        // Use the dedicated endpoint for canceling assignments
        const response = await authFetch(`${BASE_URL}/${territoryId}/annuler-assignation`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            return rejectWithValue(await response.text() || "Erreur lors de l'annulation de l'assignation");
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
    async ({id, dto}: {id: string, dto: UpdateTerritoryDto}, {rejectWithValue}) => {
        const response = await authFetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(dto),
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

// Statistics-related async thunks
export const fetchTerritoryStatusHistory = createAsyncThunk(
    "territories/fetchTerritoryStatusHistory",
    async (_, {rejectWithValue}) => {
        try {
            const response = await authFetch(`${BASE_URL}/statistiques`);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération des statistiques de territoire");
            }

            return await response.json() as TerritoryStatusHistoryDto[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchTerritoriesNotAssignedSince = createAsyncThunk(
    "territories/fetchTerritoriesNotAssignedSince",
    async (params: { startDate?: string } | undefined, {rejectWithValue}) => {
        try {
            let url = `${BASE_URL}/statistiques/non-assignes-depuis`;
            if (params?.startDate) {
                url += `?startDate=${params.startDate}`;
            }

            const response = await authFetch(url);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération des territoires non assignés");
            }

            return await response.json() as number;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchAverageAssignmentDurationByMonth = createAsyncThunk(
    "territories/fetchAverageAssignmentDurationByMonth",
    async (_, {rejectWithValue}) => {
        try {
            const response = await authFetch(`${BASE_URL}/statistiques/duree-moyenne-attribution/par-mois`);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération de la durée moyenne d'attribution par mois");
            }

            return await response.json() as AverageAssignmentDuration[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchOverallAverageAssignmentDuration = createAsyncThunk(
    "territories/fetchOverallAverageAssignmentDuration",
    async (_, {rejectWithValue}) => {
        try {
            const response = await authFetch(`${BASE_URL}/statistiques/duree-moyenne-attribution/globale`);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération de la durée moyenne globale d'attribution");
            }

            return await response.json() as number;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchTerritoryDistributionByCity = createAsyncThunk(
    "territories/fetchTerritoryDistributionByCity",
    async (params: { startDate?: string } | undefined, {rejectWithValue}) => {
        try {
            let url = `${BASE_URL}/statistiques/distribution-par-ville`;
            if (params?.startDate) {
                url += `?startDate=${params.startDate}`;
            }

            const response = await authFetch(url);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération de la distribution des territoires par ville");
            }

            return await response.json() as TerritoryDistribution[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

export const fetchLatestAssignments = createAsyncThunk(
    "territories/fetchLatestAssignments",
    async (_, {rejectWithValue}) => {
        try {
            const response = await authFetch(`/api/attributions/dernieres`);

            if (!response.ok) {
                return rejectWithValue("Erreur lors de la récupération des dernières attributions");
            }

            return await response.json() as Assignment[];
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
                            assignedTo: "N/A",
                            assignedOn: "N/A",
                            waitedFor: "N/A",
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

                const affectedId = assignment.territory.territoryId;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = findFeatureById(state, affectedId);

                if (feature) {
                    feature.properties.status = "ASSIGNED";
                    feature.properties.assignments = [...feature.properties.assignments, assignment];

                    // Mise à jour de la personne et des dates
                    if (assignment.person) {
                        feature.properties.assignedTo = assignment.person.firstName + ' ' + assignment.person.lastName;
                    }
                    feature.properties.assignedOn = assignment.assignmentDate;
                    feature.properties.waitedFor = assignment.dueDate;
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${affectedId}`);
                }

                // ✅ Met à jour aussi le territoire sélectionné si c'est le même
                updateSelectedIfSame(state, affectedId, (t) => {
                    t.status = "ASSIGNED";
                    t.assignments = [...t.assignments, assignment];
                    if (assignment.person) {
                        t.assignedTo = assignment.person.firstName + ' ' + assignment.person.lastName;
                    }
                    t.assignedOn = assignment.assignmentDate;
                    t.waitedFor = assignment.dueDate;
                });
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
                const affectedId = territory.territoryId;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = findFeatureById(state, affectedId);

                if (feature) {
                    feature.properties.status = "PENDING";
                    feature.properties.lastVisitedOn = returnDate;
                    feature.properties.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];

                    // Mise à jour de la personne (réinitialisation car le territoire est retourné)
                    feature.properties.assignedTo = "";
                    feature.properties.assignedOn = "";
                    feature.properties.waitedFor = "";

                    console.log(`✅ Territoire ${affectedId} retourné et mis à jour dans le store`);
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${affectedId}`);
                }

                // ✅ Met à jour aussi le territoire sélectionné si c'est le même
                updateSelectedIfSame(state, affectedId, (t) => {
                    t.status = "PENDING";
                    t.lastVisitedOn = returnDate;
                    t.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];
                    t.assignedTo = "";
                    t.assignedOn = "";
                    t.waitedFor = "";
                });
            })
            .addCase(returnTerritory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            .addCase(cancelAssignment.pending, (state) => {
                state.loading = true;
            })
            .addCase(cancelAssignment.fulfilled, (state, action) => {
                state.loading = false;
                const updatedAssignment = action.payload;

                if (!state.territoriesGeojson || !updatedAssignment || !updatedAssignment.territory.territoryId) {
                    console.error("❌ Problème : Assignation ou territoireId est undefined", updatedAssignment);
                    return;
                }

                const {territory, returnDate} = updatedAssignment;
                const affectedId = territory.territoryId;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = findFeatureById(state, affectedId);

                if (feature) {
                    feature.properties.status = "AVAILABLE";
                    feature.properties.lastVisitedOn = returnDate;
                    feature.properties.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];

                    // Mise à jour de la personne (réinitialisation car l'assignation est annulée)
                    feature.properties.assignedTo = "";
                    feature.properties.assignedOn = "";
                    feature.properties.waitedFor = "";

                    console.log(`✅ Assignation du territoire ${affectedId} annulée et mis à jour dans le store`);
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${affectedId}`);
                }

                // ✅ Met à jour aussi le territoire sélectionné si c'est le même
                updateSelectedIfSame(state, affectedId, (t) => {
                    t.status = "AVAILABLE";
                    t.lastVisitedOn = returnDate;
                    t.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];
                    t.assignedTo = "";
                    t.assignedOn = "";
                    t.waitedFor = "";
                });
            })
            .addCase(cancelAssignment.rejected, (state, action) => {
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
                const affectedId = territory.territoryId;

                // ✅ Recherche du territoire correspondant dans `FeatureCollection`
                const feature = findFeatureById(state, affectedId);

                if (feature) {
                    feature.properties.status = "ASSIGNED";
                    feature.properties.lastVisitedOn = assignmentDate;
                    feature.properties.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];
                    console.log(`✅ Territoire ${affectedId} retourné et mis à jour dans le store`);
                } else {
                    console.warn(`⚠️ Territoire introuvable dans le store pour ID ${affectedId}`);
                }

                // ✅ Met à jour aussi le territoire sélectionné si c'est le même
                updateSelectedIfSame(state, affectedId, (t) => {
                    t.status = "ASSIGNED";
                    t.lastVisitedOn = assignmentDate;
                    t.assignments = [{
                        ...updatedAssignment,
                        returnDate,
                    }];
                });
            })
            .addCase(extendTerritory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Statistics-related reducers
            .addCase(fetchTerritoryStatusHistory.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchTerritoryStatusHistory.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.territoryStatusHistory = action.payload;
            })
            .addCase(fetchTerritoryStatusHistory.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchTerritoriesNotAssignedSince.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchTerritoriesNotAssignedSince.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.territoriesNotAssignedSince = action.payload;
            })
            .addCase(fetchTerritoriesNotAssignedSince.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchAverageAssignmentDurationByMonth.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchAverageAssignmentDurationByMonth.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.averageAssignmentDurationByMonth = action.payload;
            })
            .addCase(fetchAverageAssignmentDurationByMonth.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchOverallAverageAssignmentDuration.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchOverallAverageAssignmentDuration.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.overallAverageAssignmentDuration = action.payload;
            })
            .addCase(fetchOverallAverageAssignmentDuration.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchTerritoryDistributionByCity.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchTerritoryDistributionByCity.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.territoryDistributionByCity = action.payload;
            })
            .addCase(fetchTerritoryDistributionByCity.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchLatestAssignments.pending, (state) => {
                state.statisticsLoading = true;
                state.error = null;
            })
            .addCase(fetchLatestAssignments.fulfilled, (state, action) => {
                state.statisticsLoading = false;
                state.latestAssignments = action.payload;
            })
            .addCase(fetchLatestAssignments.rejected, (state, action) => {
                state.statisticsLoading = false;
                state.error = action.payload as string;
            });
    },
});

// Export du reducer
export default territorySlice.reducer;
