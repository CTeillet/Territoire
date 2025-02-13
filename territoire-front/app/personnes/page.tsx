"use client";

import { useEffect, useState } from "react";
import { Person } from "@/models/person";
import PersonList from "@/components/person/person-list";

const PERSONS_MOCK = [
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
const PersonsPage = () => {
    const [persons, setPersons] = useState<Person[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPersons = async () => {
            setTimeout(() => {
                setPersons(PERSONS_MOCK);
                setLoading(false);
            }, 500);
        };

        fetchPersons();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Liste des Personnes</h1>
            {loading ? (
                <p className="text-center text-lg">Chargement...</p>
            ) : (
                <PersonList persons={persons} />
            )}
        </div>
    );
};

export default PersonsPage;
