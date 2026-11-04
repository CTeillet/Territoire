"use client";

import { Person } from "@/models/person";
import PersonCard from "./person-card";
import { phoneMatches } from "@/components/utils";
import { filterBySearch } from "@/lib/search";
import React, { useState, useMemo } from "react";
import { Users } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/page-layout";

interface PersonListProps {
  persons: Person[];
}

const PersonList: React.FC<PersonListProps> = ({ persons }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Recherche sans casse ni accents, sur le prénom et le nom dans n'importe quel ordre, l'e-mail ou le numéro
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return persons;

    const found = new Set(
      filterBySearch(persons, searchQuery, (person) => [
        person.firstName,
        person.lastName,
        person.email,
      ])
    );
    return persons.filter(
      (person) =>
        found.has(person) ||
        (person.phoneNumber && phoneMatches(person.phoneNumber, searchQuery))
    );
  }, [persons, searchQuery]);

  // Group persons by first letter of last name
  const groupedPersons = useMemo(() => {
    const groups: Record<string, Person[]> = {};

    filteredPersons.forEach((person) => {
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
    return (
      <EmptyState
        icon={Users}
        title="Aucune personne"
        description="Ajoutez une personne pour lui attribuer des territoires."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher une personne..."
        label="Rechercher une personne"
      />

      {/* No results message */}
      {filteredPersons.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Aucune personne ne correspond à votre recherche.
        </p>
      )}

      {/* Grouped persons */}
      {groupedPersons.map(([letter, personsInGroup]) => (
        <div key={letter} className="space-y-4">
          <h2
            id={`letter-${letter}`}
            className="border-b border-gray-300 pb-2 text-xl font-semibold"
          >
            {letter}
          </h2>
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
              className="rounded-md border bg-white px-2.5 py-1 text-sm font-medium hover:bg-gray-100"
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
