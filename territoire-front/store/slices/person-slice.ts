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
    'persons/fetchPersons',
    async (_, {rejectWithValue}) => {
        try {
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error("Erreur lors de la récupération des personnes");
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// 🔹 Thunk pour créer une personne
export const createPerson = createAsyncThunk(
    "persons/createPerson",
    async (newPerson: Person, {rejectWithValue}) => {
        try {
            const response = await fetch(BASE_URL, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(newPerson),
            });
            if (!response.ok) throw new Error("Échec de la création");
            return await response.json(); // Retourne la personne créée
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// 🔹 Thunk pour supprimer une personne
export const deletePerson = createAsyncThunk(
    "persons/deletePerson",
    async (id: string, {rejectWithValue}) => {
        try {
            const response = await fetch(`${BASE_URL}/${id}`, {method: "DELETE"});
            if (!response.ok) throw new Error("Échec de la suppression");
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// 🔹 Thunk pour modifier une personne
export const updatePerson = createAsyncThunk(
    "persons/updatePerson",
    async (updatedPerson: Person, {rejectWithValue}) => {
        try {
            const response = await fetch(`${BASE_URL}/${updatedPerson.id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(updatedPerson),
            });
            if (!response.ok) throw new Error("Échec de la mise à jour");
            return await response.json(); // Retourne la personne mise à jour
        } catch (error: any) {
            return rejectWithValue(error.message);
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
                    state.persons[index] = action.payload; // Met à jour la personne dans le state
                }
            })
            .addCase(updatePerson.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            });
    },
});

export default personSlice.reducer;
