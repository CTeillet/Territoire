import { createSlice } from "@reduxjs/toolkit";
import { Territory, TerritoryCollection } from "@/models/territory";
import { format } from "date-fns";
import { Assignment } from "@/models/assignment";
import { AddressNotToDoDto } from "@/models/AddressNotToDoDto";
import { UpdateTerritoryDto } from "@/models/update-territory-dto";
import { CardFraming } from "@/models/card-framing";
import {
  createApiThunk,
  jsonBody,
  thunkApi,
  withQuery,
} from "@/utils/thunk-request";

/**
 * Liste des territoires (GeoJSON), territoire affiché et actions sur eux (attribution, retour, prolongation...).
 * Les statistiques sont dans territory-statistics-slice.
 */

type TerritoryState = {
  territoriesGeojson: TerritoryCollection | null;
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
  error: null,
};

const BASE_URL = `/api/territoires`;

// --- Small helpers to reduce duplication inside reducers ---
const findFeatureById = (state: TerritoryState, id: string) => {
  return state.territoriesGeojson?.features.find((f) => f.properties.id === id);
};

const updateSelectedIfSame = (
  state: TerritoryState,
  affectedId: string,
  updater: (t: Territory) => void
) => {
  if (state.selectedTerritory && state.selectedTerritory.id === affectedId) {
    updater(state.selectedTerritory);
  }
};

/**
 * Applique la modification au territoire de la liste et au territoire affiché. Chacun peut manquer : la fiche
 * d'un territoire ouverte directement ne charge pas la liste.
 */
const updateTerritoryEverywhere = (
  state: TerritoryState,
  affectedId: string,
  updater: (t: Territory) => void
) => {
  const feature = findFeatureById(state, affectedId);
  if (feature) {
    updater(feature.properties);
  }
  updateSelectedIfSame(state, affectedId, updater);
};

/** Remplace l'attribution de même identifiant, ou l'ajoute si elle n'est pas encore connue. */
const upsertAssignment = (t: Territory, updated: Assignment) => {
  const assignments = Array.isArray(t.assignments) ? t.assignments : [];
  t.assignments = assignments.some((a) => a.id === updated.id)
    ? assignments.map((a) => (a.id === updated.id ? updated : a))
    : [...assignments, updated];
};

const clearCurrentAssignment = (t: Territory) => {
  t.assignedTo = "";
  t.assignedOn = "";
  t.waitedFor = "";
};

const applyAssignment = (t: Territory, assignment: Assignment) => {
  t.status = "ASSIGNED";
  t.assignments = [
    ...(Array.isArray(t.assignments) ? t.assignments : []),
    assignment,
  ];
  if (assignment.person) {
    t.assignedTo =
      assignment.person.firstName + " " + assignment.person.lastName;
  }
  t.assignedOn = assignment.assignmentDate;
  t.waitedFor = assignment.dueDate;
};

/** Retour : l'attribution en cours est close (l'historique est conservé), le territoire passe en attente. */
const applyReturn = (t: Territory, returned: Assignment) => {
  upsertAssignment(t, returned);
  t.status = "PENDING";
  if (returned.returnDate) {
    t.lastVisitedOn = returned.returnDate;
  }
  clearCurrentAssignment(t);
};

/**
 * Annulation : le back supprime l'attribution en cours, le territoire redevient disponible.
 * Le dernier parcours ne change pas : une annulation n'est pas un retour.
 */
const applyCancellation = (t: Territory, cancelled: Assignment) => {
  t.status = "AVAILABLE";
  t.assignments = (Array.isArray(t.assignments) ? t.assignments : []).filter(
    (a) => a.id !== cancelled.id
  );
  clearCurrentAssignment(t);
};

/**
 * Remplace une attribution modifiée et met à jour ce qui en découle : statut recalculé par le back,
 * dates de l'attribution en cours et date du dernier parcours.
 */
const applyAssignmentUpdate = (t: Territory, updated: Assignment) => {
  t.status = updated.territory.status;
  t.assignments = Array.isArray(t.assignments)
    ? t.assignments.map((a) => (a.id === updated.id ? updated : a))
    : [updated];
  if (updated.returnDate === null) {
    t.assignedOn = updated.assignmentDate;
    t.waitedFor = updated.dueDate;
  }
  const lastReturnDate = t.assignments
    .map((a) => a.returnDate)
    .filter((date): date is string => !!date)
    .sort()
    .at(-1);
  if (lastReturnDate) {
    t.lastVisitedOn = lastReturnDate;
  }
};

/**
 * Prolongation : l'attribution en cours se termine le jour où commence celle reçue (même personne, nouvelle
 * échéance). Attribuée le jour même, l'attribution garde son identifiant et est simplement remplacée.
 * Le dernier parcours ne change pas : une prolongation n'est pas un retour.
 */
const applyExtension = (t: Territory, extended: Assignment) => {
  const assignments = (Array.isArray(t.assignments) ? t.assignments : []).map(
    (a) =>
      a.id === extended.id
        ? extended
        : a.returnDate === null
          ? {
              ...a,
              returnDate: extended.assignmentDate,
              returnedVia: "PROLONGATION" as const,
            }
          : a
  );
  t.assignments = assignments.some((a) => a.id === extended.id)
    ? assignments
    : [...assignments, extended];
  t.status = extended.territory.status;
  t.assignedOn = extended.assignmentDate;
  t.waitedFor = extended.dueDate;
};

type AddressNotToDo = Territory["addressesNotToDo"][number];

/** Prolonge l'attribution en cours : nouvelle échéance donnée, sinon la durée d'attribution des paramètres. */
export const extendTerritory = createApiThunk(
  "territories/extendTerritory",
  (
    { territoryId, dueDate }: { territoryId: string; dueDate?: string },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Assignment>(
      withQuery(`${BASE_URL}/${territoryId}/prolongation`, { dueDate }),
      "Erreur lors de la prolongation du territoire",
      { method: "POST" }
    )
);

export const returnTerritory = createApiThunk(
  "territories/returnTerritory",
  (territoryId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Assignment>(
      `${BASE_URL}/${territoryId}/retour`,
      "Erreur lors du retour du territoire",
      { method: "POST" }
    )
);

export const cancelAssignment = createApiThunk(
  "territories/cancelAssignment",
  (territoryId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Assignment>(
      `${BASE_URL}/${territoryId}/annuler-assignation`,
      "Erreur lors de l'annulation de l'assignation",
      { method: "POST" }
    )
);

/** Motif de l'API affiché tel quel en cas de refus (ex. territoire déjà attribué entre-temps). */
export const assignTerritory = createApiThunk(
  "territories/assignTerritory",
  (
    { territoryId, personId }: { territoryId: string; personId: string },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Assignment>(
      `${BASE_URL}/${territoryId}/attribuer/${personId}`,
      "Erreur lors de l'assignation du territoire",
      { method: "POST" }
    )
);

/** Corrige les dates d'une attribution : le back recalcule le statut du territoire (renvoyé dans `territory.status`). */
export const updateAssignmentDates = createApiThunk(
  "territories/updateAssignmentDates",
  (
    {
      assignmentId,
      ...dates
    }: {
      assignmentId: string;
      assignmentDate: string;
      dueDate: string;
      returnDate: string | null;
    },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Assignment>(
      `/api/attributions/${assignmentId}`,
      "Erreur lors de la modification des dates d'attribution",
      jsonBody("PUT", dates)
    )
);

export const deleteTerritory = createApiThunk(
  "territories/deleteTerritory",
  async (territoryId: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${territoryId}`,
      "Erreur lors de la suppression du territoire",
      { method: "DELETE" }
    )) ?? territoryId
);

export const updateTerritory = createApiThunk(
  "territories/updateTerritory",
  ({ id, dto }: { id: string; dto: UpdateTerritoryDto }, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Territory>(
      `${BASE_URL}/${id}`,
      "Erreur lors de la mise à jour du territoire",
      jsonBody("PUT", dto)
    )
);

/** Signale un territoire perdu (sa carte papier a disparu) ou le retire des perdus. */
export const updateTerritoryLost = createApiThunk(
  "territories/updateTerritoryLost",
  async (
    { territoryId, lost }: { territoryId: string; lost: boolean },
    { rejectWithValue }
  ) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${territoryId}/perdu`,
      lost
        ? "Erreur lors du signalement du territoire perdu"
        : "Erreur lors du retrait du territoire des perdus",
      jsonBody("PUT", { lost })
    )) ?? { territoryId, lost }
);

/**
 * Génère la carte physique du territoire (formulaire « Carte de territoire » avec le plan du quartier) et la garde
 * comme carte du territoire, celle de la page « Impression des cartes ».
 */
export const saveTerritoryCard = createApiThunk(
  "territories/saveTerritoryCard",
  async (
    {
      territoryId,
      framing,
      plan,
    }: {
      territoryId: string;
      framing: CardFraming;
      /** Plan IGN dessiné par le navigateur, celui de l'aperçu. */
      plan: Blob;
    },
    { rejectWithValue }
  ) => {
    const body = new FormData();
    body.append("plan", plan, "plan.png");
    return (
      (await thunkApi(rejectWithValue).noContent(
        withQuery(`${BASE_URL}/${territoryId}/carte-physique`, {
          cadrage: framing,
        }),
        "Erreur lors de l'enregistrement de la carte",
        { method: "POST", body }
      )) ?? territoryId
    );
  }
);

/** Territoire en attente rendu disponible sans attendre la fin de la durée d'attente (refusé par le back sinon). */
export const makeTerritoryAvailable = createApiThunk(
  "territories/makeTerritoryAvailable",
  async (territoryId: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${territoryId}/rendre-disponible`,
      "Erreur lors de la remise à disposition du territoire",
      { method: "POST" }
    )) ?? territoryId
);

export const fetchTerritories = createApiThunk(
  "territories/fetchGeoJson",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<TerritoryCollection>(
      `${BASE_URL}/geojson`,
      "Erreur lors de la récupération des territoires (GeoJSON)"
    )
);

export const addTerritory = createApiThunk(
  "territories/add",
  ({ name, cityId }: { name: string; cityId: string }, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Territory>(
      BASE_URL,
      "Erreur lors de l'ajout du territoire",
      jsonBody("POST", { name, cityId })
    )
);

export const fetchTerritoryById = createApiThunk(
  "territories/fetchById",
  (id: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Territory>(
      `${BASE_URL}/${id}`,
      "Erreur lors de la récupération du territoire"
    )
);

const addressesUrl = (territoryId: string) =>
  `${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter`;

/** Renvoie l'adresse ajoutée. */
export const addAddressNotToVisit = createApiThunk(
  "territories/addAddressNotToVisit",
  (
    {
      territoryId,
      address,
    }: { territoryId: string; address: AddressNotToDoDto },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<AddressNotToDo>(
      addressesUrl(territoryId),
      "Erreur lors de l'ajout de l'adresse",
      jsonBody("POST", address)
    )
);

/** Renvoie l'adresse modifiée. */
export const modifyAddressNotToVisit = createApiThunk(
  "territories/modifyAddressNotToVisit",
  (
    {
      territoryId,
      address,
      addressId,
    }: { territoryId: string; address: AddressNotToDoDto; addressId: string },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<AddressNotToDo>(
      `${addressesUrl(territoryId)}/${addressId}`,
      "Erreur lors de la modification de l'adresse",
      jsonBody("PUT", address)
    )
);

export const deleteAddressNotToVisit = createApiThunk(
  "territories/deleteAddressNotToVisit",
  async (
    { territoryId, addressId }: { territoryId: string; addressId: string },
    { rejectWithValue }
  ) =>
    (await thunkApi(rejectWithValue).noContent(
      `${addressesUrl(territoryId)}/${addressId}`,
      "Erreur lors de la suppression de l'adresse",
      { method: "DELETE" }
    )) ?? { territoryId, addressId }
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
        if (
          state.selectedTerritory &&
          state.selectedTerritory.id === action.payload.id
        ) {
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

      .addCase(updateTerritoryLost.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateTerritoryLost.fulfilled, (state, action) => {
        state.updating = false;
        const { territoryId, lost } = action.payload;
        const feature = findFeatureById(state, territoryId);
        if (feature) {
          feature.properties.lost = lost;
        }
        updateSelectedIfSame(state, territoryId, (t) => {
          t.lost = lost;
        });
      })
      .addCase(updateTerritoryLost.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // La carte du territoire est servie sous l'identifiant du territoire (cf. TerritoryMapper)
      .addCase(saveTerritoryCard.fulfilled, (state, action) => {
        updateTerritoryEverywhere(state, action.payload, (t) => {
          t.territoryMapId = action.payload;
          t.lastModifiedDate = format(new Date(), "yyyy-MM-dd");
        });
      })

      // Seul le statut change : les attributions et le dernier parcours restent ceux du dernier retour
      .addCase(makeTerritoryAvailable.pending, (state) => {
        state.updating = true;
      })
      .addCase(makeTerritoryAvailable.fulfilled, (state, action) => {
        state.updating = false;
        updateTerritoryEverywhere(state, action.payload, (t) => {
          t.status = "AVAILABLE";
        });
      })
      .addCase(makeTerritoryAvailable.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(deleteTerritory.fulfilled, (state, action) => {
        if (state.territoriesGeojson) {
          state.territoriesGeojson.features =
            state.territoriesGeojson.features.filter(
              (territory) => territory.properties.id !== action.payload
            );
        }

        if (state.selectedTerritory?.id === action.payload) {
          state.selectedTerritory = null; // Supprime du store sélectionné si c'était lui
        }
      })

      // Assignation, retour, annulation, prolongation : `updating` plutôt que `loading`,
      // sinon les pages masquent leur tableau pendant l'enregistrement et il perd sa page courante
      .addCase(assignTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(assignTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const assignment = action.payload;

        if (!assignment || !assignment.territory.territoryId) {
          console.error(
            "❌ Problème : l'assignation ou le territoireId est undefined",
            assignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          assignment.territory.territoryId,
          (t) => applyAssignment(t, assignment)
        );
      })
      .addCase(assignTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(returnTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(returnTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const updatedAssignment: Assignment = action.payload;

        if (!updatedAssignment || !updatedAssignment.territory.territoryId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            updatedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          updatedAssignment.territory.territoryId,
          (t) => applyReturn(t, updatedAssignment)
        );
      })
      .addCase(returnTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(cancelAssignment.pending, (state) => {
        state.updating = true;
      })
      .addCase(cancelAssignment.fulfilled, (state, action) => {
        state.updating = false;
        const cancelledAssignment: Assignment = action.payload;

        if (
          !cancelledAssignment ||
          !cancelledAssignment.territory.territoryId
        ) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            cancelledAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          cancelledAssignment.territory.territoryId,
          (t) => applyCancellation(t, cancelledAssignment)
        );
      })
      .addCase(cancelAssignment.rejected, (state, action) => {
        state.updating = false;
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
          const index = state.selectedTerritory.addressesNotToDo.findIndex(
            (addr) => addr.id === action.payload.id
          );
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
          state.selectedTerritory.addressesNotToDo =
            state.selectedTerritory.addressesNotToDo.filter(
              (addr) => addr.id !== action.payload.addressId
            );
        }
      })
      .addCase(deleteAddressNotToVisit.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(extendTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(extendTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const extendedAssignment = action.payload;

        if (!extendedAssignment || !extendedAssignment.territory.territoryId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            extendedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          extendedAssignment.territory.territoryId,
          (t) => applyExtension(t, extendedAssignment)
        );
      })
      .addCase(extendTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // `updating` plutôt que `loading` : la page du territoire reste affichée pendant l'enregistrement
      .addCase(updateAssignmentDates.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateAssignmentDates.fulfilled, (state, action) => {
        state.updating = false;
        const updatedAssignment = action.payload;
        const affectedId = updatedAssignment?.territory?.territoryId;
        if (!affectedId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            updatedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(state, affectedId, (t) =>
          applyAssignmentUpdate(t, updatedAssignment)
        );
      })
      .addCase(updateAssignmentDates.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });
  },
});

// Export du reducer
export default territorySlice.reducer;
