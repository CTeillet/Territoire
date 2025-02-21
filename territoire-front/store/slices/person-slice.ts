import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {Person} from "@/models/person";

const BASE_URL = "/api/personnes";

interface PersonState {
    persons: Person[];
    loading: boolean;
    deleting: boolean;
    creating: boolean;
    updating: boolean;
    error: string | null;
}

const initialState: PersonState = {
    persons: [],
    loading: false,
    deleting: false,
    creating: false,
    updating: false,
    error: null,
};


// 🔹 Thunk pour récupérer les personnes
export const fetchPersons = createAsyncThunk(
    "persons/fetchPersons",
    async (_, { rejectWithValue }) => {
        const response = await fetch(BASE_URL);

        // 🔹 Retourner immédiatement `rejectWithValue` au lieu de `throw`
        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des personnes");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// 🔹 Thunk pour créer une personne
export const createPerson = createAsyncThunk<Person, Person | { firstName: string; lastName: string }>(
    "persons/createPerson",
    async (newPerson: Person | { firstName: string; lastName: string }, { rejectWithValue }) => {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPerson),
        });

        // 🔹 Vérifie si la requête à échouer et retourne immédiatement `rejectWithValue`
        if (!response.ok) {
            return rejectWithValue("Échec de la création");
        }

        try {
            return await response.json(); // Retourne la personne créée
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);


// 🔹 Thunk pour supprimer une personne
export const deletePerson = createAsyncThunk(
    "persons/deletePerson",
    async (id: string, { rejectWithValue }) => {
        const response = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });

        // 🔹 Vérifie si la requête a échoué et retourne immédiatement `rejectWithValue`
        if (!response.ok) {
            return rejectWithValue("Échec de la suppression");
        }

        return id; // ✅ Retourne l'ID si la suppression a réussi
    }
);

// 🔹 Thunk pour modifier une personne
export const updatePerson = createAsyncThunk(
    "persons/updatePerson",
    async (updatedPerson: Person, { rejectWithValue }) => {
        const response = await fetch(`${BASE_URL}/${updatedPerson.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPerson),
        });

        // 🔹 Vérifie si la requête à échouer et retourne immédiatement `rejectWithValue`
        if (!response.ok) {
            return rejectWithValue("Échec de la mise à jour");
        }

        try {
            return await response.json(); // Retourne la personne mise à jour
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);


const personSlice = createSlice({
    name: 'persons',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // 🔹 Récupération des personnes
            .addCase(fetchPersons.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPersons.fulfilled, (state, action) => {
                state.loading = false;
                state.persons = action.payload;
            })
            .addCase(fetchPersons.rejected, (state, action) => {
                state.loading = false;
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
                state.persons = state.persons.filter(person => person.id !== action.payload);
            })
            .addCase(deletePerson.rejected, (state, action) => {
                state.deleting = false;
                state.error = action.payload as string;
            })

            // 🔹 Mise à jour d'une personne
            .addCase(updatePerson.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(updatePerson.fulfilled, (state, action) => {
                state.updating = false;
                const index = state.persons.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.persons[index] = action.payload; // Met à jour la personne dans le store
                }
            })
            .addCase(updatePerson.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            });
    },
});

export default personSlice.reducer;
