import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AssignTerritoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    people: { id: string; firstName: string; lastName: string }[];
    onAssign: (personId: string | null, newPerson?: { firstName: string; lastName: string }) => void;
}

const AssignTerritoryDialog: React.FC<AssignTerritoryDialogProps> = ({ isOpen, onOpenChange, people, onAssign }) => {
    const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
    const [newPerson, setNewPerson] = useState({ firstName: "", lastName: "" });

    // Vérification des conditions pour activer le bouton
    const isFormValid = selectedPerson !== null || (newPerson.firstName.trim() !== "" && newPerson.lastName.trim() !== "");

    const handleAssign = () => {
        if (isFormValid) {
            onAssign(selectedPerson, newPerson);
            onOpenChange(false); // Fermer le dialog après assignation
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="z-20] ">
                <DialogHeader>
                    <DialogTitle>Assigner une personne au territoire</DialogTitle>
                </DialogHeader>

                {/* Sélection d'une personne existante */}
                <Select
                    value={selectedPerson ?? "none"} // Garantit que "Aucune personne" est bien sélectionné
                    onValueChange={(value) => {
                        setTimeout(() => setSelectedPerson(value === "none" ? null : value), 0);
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue>
                            {selectedPerson
                                ? people.find((p) => p.id === selectedPerson)?.firstName + " " + people.find((p) => p.id === selectedPerson)?.lastName
                                : "Sélectionner une personne ou aucune"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Aucune personne</SelectItem> {/* Option pour ne rien sélectionner */}
                        {people.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                                {person.firstName} {person.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Création d'une nouvelle personne (désactivé si une personne est sélectionnée) */}
                <div className="flex flex-col space-y-2 mt-4">
                    <span className="text-sm text-gray-600">Ou créer une nouvelle personne :</span>
                    <Input
                        placeholder="Prénom"
                        value={newPerson.firstName}
                        onChange={(e) => setNewPerson({ ...newPerson, firstName: e.target.value })}
                        disabled={!!selectedPerson}
                        className={selectedPerson ? "opacity-50 cursor-not-allowed bg-gray-200" : ""}
                    />
                    <Input
                        placeholder="Nom"
                        value={newPerson.lastName}
                        onChange={(e) => setNewPerson({ ...newPerson, lastName: e.target.value })}
                        disabled={!!selectedPerson}
                        className={selectedPerson ? "opacity-50 cursor-not-allowed bg-gray-200" : ""}
                    />
                </div>

                {/* Bouton de validation */}
                <Button
                    className={`w-full mt-4 ${isFormValid ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-400 cursor-not-allowed"}`}
                    onClick={handleAssign}
                    disabled={!isFormValid} // Désactivé tant que les conditions ne sont pas remplies
                >
                    Confirmer l&apos;assignation
                </Button>
            </DialogContent>
        </Dialog>
    );
}

export default AssignTerritoryDialog;
