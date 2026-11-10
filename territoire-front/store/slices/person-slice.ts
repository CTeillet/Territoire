import { Person } from "@/models/person";
import { Assignment } from "@/models/assignment";
import { createSlice } from "@reduxjs/toolkit";
import { createApiThunk, jsonBody, thunkApi } from "@/utils/thunk-request";

const BASE_URL = "/api/personnes";

interface PersonState {
  persons: Person[];
  loading: boolean;
  deleting: boolean;
  creating: boolean;
  updating: boolean;
  error: string | null;
  isFetchingPersons: boolean;
  assignedTerritories: Assignment[];
  loadingAssignedTerritories: boolean;
}

const initialState: PersonState = {
  persons: [],
  loading: false,
  deleting: false,
  creating: false,
  updating: false,
  error: null,
  isFetchingPersons: false,
  assignedTerritories: [],
  loadingAssignedTerritories: false,
};

// 🔹 Thunk pour récupérer les personnes (une seule requête à la fois)
export const fetchPersons = createApiThunk(
  "persons/fetchPersons",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Person[]>(
      BASE_URL,
      "Erreur lors de la récupération des personnes"
    ),
  {
    condition: (_, { getState }) =>
      !(getState() as { persons: PersonState }).persons.isFetchingPersons,
  }
);

// 🔹 Thunk pour créer une personne (motif du serveur en cas de refus, ex. « Le nom est requis »)
export const createPerson = createApiThunk(
  "persons/createPerson",
  (
    newPerson: Person | { firstName: string; lastName: string },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Person>(
      BASE_URL,
      "Échec de l'ajout de la personne. Veuillez réessayer.",
      jsonBody("POST", newPerson)
    )
);

// 🔹 Thunk pour supprimer une personne (refusé par le serveur si elle est dans l'historique)
export const deletePerson = createApiThunk(
  "persons/deletePerson",
  async (id: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${id}`,
      "Échec de la suppression",
      { method: "DELETE" }
    )) ?? id
);

// 🔹 Thunk pour modifier une personne
export const updatePerson = createApiThunk(
  "persons/updatePerson",
  (updatedPerson: Person, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Person>(
      `${BASE_URL}/${updatedPerson.id}`,
      "Échec de la mise à jour",
      jsonBody("PUT", updatedPerson)
    )
);

// 🔹 Thunk pour récupérer les territoires assignés à une personne
export const fetchAssignedTerritories = createApiThunk(
  "persons/fetchAssignedTerritories",
  (personId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Assignment[]>(
      `${BASE_URL}/${personId}/territoires`,
      "Erreur lors de la récupération des territoires assignés"
    )
);

const personSlice = createSlice({
  name: "persons",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 🔹 Récupération des personnes
      .addCase(fetchPersons.pending, (state) => {
        state.loading = true;
        state.isFetchingPersons = true;
        state.error = null;
      })
      .addCase(fetchPersons.fulfilled, (state, action) => {
        state.loading = false;
        state.isFetchingPersons = false;
        state.persons = action.payload;
      })
      .addCase(fetchPersons.rejected, (state, action) => {
        state.loading = false;
        state.isFetchingPersons = false;
        state.error = action.payload as string;
      })

      // 🔹 Création d'une personne
      .addCase(createPerson.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createPerson.fulfilled, (state, action) => {
        state.creating = false;
        state.persons.push(action.payload); // Ajoute la personne validée par l'API
      })
      .addCase(createPerson.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // 🔹 Suppression d'une personne
      .addCase(deletePerson.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deletePerson.fulfilled, (state, action) => {
        state.deleting = false;
        state.persons = state.persons.filter(
          (person) => person.id !== action.payload
        );
      })
      // Le motif est affiché par l'appelant (toast) : le mettre dans `error`
      // remplacerait toute la fiche de la personne par ce message
      .addCase(deletePerson.rejected, (state) => {
        state.deleting = false;
      })

      // 🔹 Mise à jour d'une personne
      .addCase(updatePerson.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updatePerson.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.persons.findIndex(
          (p) => p.id === action.payload.id
        );
        if (index !== -1) {
          state.persons[index] = action.payload; // Met à jour la personne dans le store
        }
      })
      // Motif affiché en toast par l'appelant : la fiche reste en édition (pas d'erreur de page)
      .addCase(updatePerson.rejected, (state) => {
        state.updating = false;
      })

      // 🔹 Récupération des territoires assignés à une personne
      .addCase(fetchAssignedTerritories.pending, (state) => {
        state.loadingAssignedTerritories = true;
        state.error = null;
      })
      .addCase(fetchAssignedTerritories.fulfilled, (state, action) => {
        state.loadingAssignedTerritories = false;
        state.assignedTerritories = action.payload;
      })
      .addCase(fetchAssignedTerritories.rejected, (state, action) => {
        state.loadingAssignedTerritories = false;
        state.error = action.payload as string;
      });
  },
});

export default personSlice.reducer;
