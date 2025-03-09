import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Person } from "@/models/person";
import { toast } from "sonner";

type CreatePersonDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (person: Person) => Promise<void>; // Modification pour attendre la réponse du serveur
    isLoading: boolean; // Ajout pour suivre l'état de création
};

const CreatePersonDialog: React.FC<CreatePersonDialogProps> = ({ isOpen, onOpenChange, onCreate, isLoading }) => {
    const [person, setPerson] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });

    const isFormValid = person.firstName.trim() !== "" && person.lastName.trim() !== "";

    const handleCreate = async () => {
        if (isFormValid) {
            try {
                await onCreate({
                    id: null, // L'ID sera généré par le backend
                    firstName: person.firstName.trim(),
                    lastName: person.lastName.trim(),
                    email: person.email.trim() || undefined,
                    phoneNumber: person.phoneNumber.trim() || undefined,
                });

                toast.success("La personne a bien été ajoutée !");

                onOpenChange(false); // Fermer le modal après création réussie
                setPerson({ firstName: "", lastName: "", email: "", phoneNumber: "" }); // Réinitialiser le formulaire
            } catch (error) {
                console.log(error);
                toast.error("Échec de l'ajout de la personne. Veuillez réessayer.");
            }
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
                    className="w-full mt-4"
                    onClick={handleCreate}
                    disabled={!isFormValid || isLoading} // Désactiver si le formulaire est invalide ou si l'API est en attente
                >
                    {isLoading ? "Ajout en cours..." : "Ajouter la personne"}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePersonDialog;
