"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Person } from "@/models/person";
import React from "react";
import {FileUser} from "lucide-react";
import {formatPhoneNumber} from "@/components/utils";

interface PersonCardProps {
    person: Person;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
    return (
        <Card className="h-full flex flex-col">
            <CardContent className="flex flex-col flex-grow">
                <h2 className="text-xl font-semibold mt-2">
                    {person.firstName} {person.lastName}
                </h2>
                {person.email && <p className="text-gray-600 mt-2">{person.email}</p>}
                {person.phoneNumber && <p className="text-gray-600 mt-2">{formatPhoneNumber(person.phoneNumber)}</p>}
                <div className="flex-grow"></div> {/* Espace flexible pour pousser le bouton en bas */}
                <Link href={`/personnes/${person.id}`}>
                    <Button className="mt-2"><FileUser/></Button>
                </Link>
            </CardContent>
        </Card>
    );
};


export default PersonCard;
