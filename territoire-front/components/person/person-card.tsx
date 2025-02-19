"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Person } from "@/models/person";
import React from "react";
import {FileUser, Trash2} from "lucide-react";
import {formatPhoneNumber} from "@/components/utils";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {useAppDispatch, useAppSelector} from "@/store/store";
import {deletePerson} from "@/store/slices/person-slice";

interface PersonCardProps {
    person: Person;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
    const dispatch = useAppDispatch();
    const deleting = useAppSelector((state) => state.persons.deleting);

    const handleDelete = () => {
        if (person.id != null) {
            dispatch(deletePerson(person.id));
        }
    };

    return (
        <Card className="h-full flex flex-col p-4">
            <CardContent className="flex flex-col flex-grow">
                <h2 className="text-xl font-semibold">{person.firstName} {person.lastName}</h2>
                {person.email && <p className="text-gray-600 mt-2">{person.email}</p>}
                {person.phoneNumber && <p className="text-gray-600 mt-2">{formatPhoneNumber(person.phoneNumber)}</p>}

                <div className="flex-grow"></div>

                <div className="flex gap-2 mt-2 justify-end">
                    <Link href={`/personnes/${person.id}`}>
                        <Button variant="outline" className="p-2">
                            <FileUser size={18} />
                        </Button>
                    </Link>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="p-2" disabled={deleting}>
                                {deleting ? "Suppression..." : <Trash2 size={18} />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer <b>{person.firstName} {person.lastName}</b> ?<br/>
                                    Cette action est irréversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex justify-end gap-2">
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Supprimer
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
};

export default PersonCard;
