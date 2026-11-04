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
    <Card className="h-full gap-0 py-4">
      <CardContent className="flex flex-grow items-start gap-3 px-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold break-words">
            {person.firstName} {person.lastName}
          </h3>
          {person.email && (
            <p className="mt-1 text-sm break-words text-muted-foreground">
              {person.email}
            </p>
          )}
          {person.phoneNumber && (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPhoneNumber(person.phoneNumber)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/personnes/${person.id}`}
              aria-label={`Voir la fiche de ${person.firstName} ${person.lastName}`}
              title="Voir la fiche"
            >
              <FileUser aria-hidden="true" />
            </Link>
          </Button>
          <DeletePersonButton person={person} />
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonCard;
