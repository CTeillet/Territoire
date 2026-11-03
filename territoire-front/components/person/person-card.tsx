"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Person } from "@/models/person";
import React from "react";
import { FileUser } from "lucide-react";
import { formatPhoneNumber } from "@/components/utils";
import DeletePersonButton from "./delete-person-button";

interface PersonCardProps {
  person: Person;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  return (
    <Card className="h-full flex flex-col p-4">
      <CardContent className="flex flex-col flex-grow">
        <h2 className="text-xl font-semibold">
          {person.firstName} {person.lastName}
        </h2>
        {person.email && <p className="text-gray-600 mt-2">{person.email}</p>}
        {person.phoneNumber && (
          <p className="text-gray-600 mt-2">
            {formatPhoneNumber(person.phoneNumber)}
          </p>
        )}

        <div className="flex-grow"></div>

        <div className="flex gap-2 mt-2 justify-end">
          <Link
            href={`/personnes/${person.id}`}
            aria-label={`Voir la fiche de ${person.firstName} ${person.lastName}`}
          >
            <Button variant="outline" className="p-2" tabIndex={-1}>
              <FileUser size={18} />
            </Button>
          </Link>

          <DeletePersonButton person={person} className="p-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonCard;
