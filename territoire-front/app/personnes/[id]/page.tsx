"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchPersons, updatePerson } from "@/store/slices/person-slice";
import { Person } from "@/models/person";
import PersonEditForm from "@/components/person/person-edit-form";
import PersonDetails from "@/components/person/person-details";
import PersonActions from "@/components/person/person-actions";
import { useAuth } from "@/hooks/use-auth";

const PersonDetail = () => {
    const { id } = useParams();
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    // Toujours exécuter les hooks Redux avant tout conditionnement
    const persons = useSelector((state: RootState) => state.persons.persons);
    const loading = useSelector((state: RootState) => state.persons.loading);
    const updating = useSelector((state: RootState) => state.persons.updating);
    const error = useSelector((state: RootState) => state.persons.error);

    const person = persons.find((p) => p.id === id);

    // État pour l'édition et le formulaire
    const [editing, setEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: undefined as string | undefined,
        phoneNumber: undefined as string | undefined,
    });

    // Redirection si l'utilisateur n'est pas authentifié
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    // Chargement des personnes si elles ne sont pas en mémoire
    useEffect(() => {
        if (!persons.length) {
            dispatch(fetchPersons());
        }
    }, [dispatch, persons.length]);

    // Mise à jour du formulaire quand la personne est trouvée
    useEffect(() => {
        if (person) {
            setFormData({
                firstName: person.firstName,
                lastName: person.lastName,
                email: person.email || undefined,
                phoneNumber: person.phoneNumber || "",
            });
        }
    }, [person]);

    // Affichage temporaire pour éviter un écran blanc avant la redirection
    if (!isAuthenticated) {
        return <p>Redirection en cours...</p>;
    }

    // Gestion du chargement et des erreurs
    if (loading) return <p className="text-center text-lg">Chargement...</p>;
    if (error) return <p className="text-center text-lg text-red-500">{error}</p>;
    if (!person) return <p className="text-center text-lg text-red-500">Personne introuvable</p>;

    // Gestion des changements de formulaire
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Enregistrement des modifications
    const handleSave = () => {
        if (person) {
            const updatedPerson: Person = {
                ...person,
                ...formData,
            };
            dispatch(updatePerson(updatedPerson)).then(() => {
                setEditing(false);
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">
                {editing ? "Modifier les informations" : `Détails de ${person.firstName} ${person.lastName}`}
            </h1>

            {editing ? (
                <PersonEditForm formData={formData} onChange={handleInputChange} />
            ) : (
                <PersonDetails person={person} />
            )}

            <PersonActions
                editing={editing}
                onEdit={() => setEditing(true)}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
            />

            {updating && <p className="text-center text-blue-500">Mise à jour en cours...</p>}
        </div>
    );
};

export default PersonDetail;
