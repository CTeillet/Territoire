"use client";

import { Person } from "@/models/person";
import PersonCard from "./person-card";
import React, { useState, useMemo } from "react";

interface PersonListProps {
    persons: Person[];
}

const PersonList: React.FC<PersonListProps> = ({ persons }) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter persons based on search query
    const filteredPersons = useMemo(() => {
        if (!searchQuery.trim()) return persons;

        const query = searchQuery.toLowerCase();
        return persons.filter(person => 
            person.firstName.toLowerCase().includes(query) || 
            person.lastName.toLowerCase().includes(query) ||
            (person.email && person.email.toLowerCase().includes(query)) ||
            (person.phoneNumber && person.phoneNumber.toLowerCase().includes(query))
        );
    }, [persons, searchQuery]);

    // Group persons by first letter of last name
    const groupedPersons = useMemo(() => {
        const groups: Record<string, Person[]> = {};

        filteredPersons.forEach(person => {
            const firstLetter = person.lastName.charAt(0).toUpperCase();
            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(person);
        });

        // Sort the groups by letter
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredPersons]);

    if (persons.length === 0) {
        return <p className="text-center text-lg">Aucune personne trouvée.</p>;
    }

    return (
        <div className="space-y-6">
            {/* Search field */}
            <div className="w-full">
                <input
                    type="text"
                    placeholder="Rechercher une personne..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* No results message */}
            {filteredPersons.length === 0 && (
                <p className="text-center text-lg">Aucune personne ne correspond à votre recherche.</p>
            )}

            {/* Grouped persons */}
            {groupedPersons.map(([letter, personsInGroup]) => (
                <div key={letter} className="space-y-4">
                    <h2 id={`letter-${letter}`} className="text-2xl font-bold border-b-2 border-gray-300 pb-2">{letter}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {personsInGroup.map((person) => (
                            <PersonCard key={person.id} person={person} />
                        ))}
                    </div>
                </div>
            ))}

            {/* Alphabet navigation */}
            {filteredPersons.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {groupedPersons.map(([letter]) => (
                        <a 
                            key={letter} 
                            href={`#letter-${letter}`}
                            className="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            {letter}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PersonList;
