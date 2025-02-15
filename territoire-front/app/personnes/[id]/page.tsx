"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Person } from "@/models/person";
import PersonEditForm from "@/components/person/person-edit-form";
import PersonDetails from "@/components/person/person-details";
import PersonActions from "@/components/person/person-actions";

const MOCK_PERSONS: Person[] = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
        phoneNumber: "0612345678",
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440001",
        firstName: "Marie",
        lastName: "Curie",
        email: "marie.curie@example.com",
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440002",
        firstName: "Albert",
        lastName: "Einstein",
        phoneNumber: "0698765432",
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440003",
        firstName: "Yves",
        lastName: "Montant",
    },
];

const PersonDetail = () => {
    const { id } = useParams();
    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [editing, setEditing] = useState<boolean>(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
    });

    useEffect(() => {
        // Simule un appel API
        const fetchPerson = () => {
            setTimeout(() => {
                const foundPerson = MOCK_PERSONS.find((p) => p.id === id);
                if (foundPerson) {
                    setPerson(foundPerson);
                    setFormData({
                        firstName: foundPerson.firstName,
                        lastName: foundPerson.lastName,
                        email: foundPerson.email || "",
                        phoneNumber: foundPerson.phoneNumber || "",
                    });
                }
                setLoading(false);
            });
        };

        fetchPerson();
    }, [id]);

    if (loading) return <p className="text-center text-lg">Chargement...</p>;

    if (!person) return <p className="text-center text-lg text-red-500">Personne introuvable</p>;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        setPerson({
            ...person,
            ...formData,
        });
        setEditing(false);
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
        </div>
    );
};

export default PersonDetail;
