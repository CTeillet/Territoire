"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchPersons, createPerson } from "@/store/slices/person-slice";
import PersonList from "@/components/person/person-list";
import PlusButton from "@/components/shared/plus-button";
import CreatePersonDialog from "@/components/person/create-person-dialog";
import { Person } from "@/models/person";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const PersonsPage = () => {
    const dispatch = useAppDispatch();
    const { persons, loading, creating } = useAppSelector(state => state.persons);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    // Redirection si l'utilisateur n'est pas authentifié
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    // Toujours exécuter ce hook avant toute condition
    useEffect(() => {
        dispatch(fetchPersons());
    }, [dispatch]);

    // Affichage temporaire pour éviter un écran blanc avant la redirection
    if (!isAuthenticated) {
        return <p>Redirection en cours...</p>;
    }

    const handleAddPerson: React.MouseEventHandler<HTMLButtonElement> = () => {
        setCreateDialogOpen(true);
    };

    const handleCreatePerson = async (person: Person) => {
        await dispatch(createPerson(person)); // Attend la réponse du backend
        setCreateDialogOpen(false); // Ferme le dialogue si tout s'est bien passé
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Liste des Personnes</h1>
            {loading ? (
                <p className="text-center text-lg">Chargement...</p>
            ) : (
                <PersonList persons={persons} />
            )}
            <div className="flex justify-end mt-4">
                <PlusButton onClick={handleAddPerson} />
            </div>
            <CreatePersonDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={handleCreatePerson}
                isLoading={creating} // Ajout de l'état de création
            />
        </div>
    );
};

export default PersonsPage;
