import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {Person} from "@/models/person";

type CreatePersonDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (person: Person) => void;
};

const CreatePersonDialog: React.FC<CreatePersonDialogProps> = ({ isOpen, onOpenChange, onCreate }) => {
    const [person, setPerson] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });

    const isFormValid = person.firstName.trim() !== "" && person.lastName.trim() !== "";

    const handleCreate = () => {
        if (isFormValid) {
            onCreate({
                id: null,
                firstName: person.firstName.trim(),
                lastName: person.lastName.trim(),
                email: person.email.trim() || undefined,
                phoneNumber: person.phoneNumber.trim() || undefined,
            });
            onOpenChange(false); // Fermer le dialog après création
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer une nouvelle personne</DialogTitle>
                </DialogHeader>

                {/* Formulaire de création */}
                <div className="flex flex-col space-y-3">
                    <Input
                        placeholder="Prénom *"
                        value={person.firstName}
                        onChange={(e) => setPerson({ ...person, firstName: e.target.value })}
                    />
                    <Input
                        placeholder="Nom *"
                        value={person.lastName}
                        onChange={(e) => setPerson({ ...person, lastName: e.target.value })}
                    />
                    <Input
                        placeholder="Email (optionnel)"
                        type="email"
                        value={person.email}
                        onChange={(e) => setPerson({ ...person, email: e.target.value })}
                    />
                    <Input
                        placeholder="Téléphone (optionnel)"
                        type="tel"
                        value={person.phoneNumber}
                        onChange={(e) => setPerson({ ...person, phoneNumber: e.target.value })}
                    />
                </div>

                {/* Bouton de validation */}
                <Button
                    className={`w-full mt-4 ${isFormValid ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"}`}
                    onClick={handleCreate}
                    disabled={!isFormValid}
                >
                    Ajouter la personne
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePersonDialog;
