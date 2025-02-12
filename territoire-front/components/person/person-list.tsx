"use client";

import { Person } from "@/models/person";
import PersonCard from "./person-card";

interface PersonListProps {
    persons: Person[];
}

const PersonList: React.FC<PersonListProps> = ({ persons }) => {
    if (persons.length === 0) {
        return <p className="text-center text-lg">Aucune personne trouvée.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {persons.map((person) => (
                <PersonCard key={person.id} person={person} />
            ))}
        </div>
    );
};

export default PersonList;
