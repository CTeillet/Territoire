"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {Person} from "@/models/person";
import {ChevronsUpDown} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

interface AssignTerritoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    people: Person[];
    onAssign: (personId: string | null, newPerson: { firstName: string; lastName: string }) => void;
}

const AssignTerritoryDialog: React.FC<AssignTerritoryDialogProps> = ({ isOpen, onOpenChange, people, onAssign }) => {
    const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
    const [newPerson, setNewPerson] = useState({ firstName: "", lastName: "" });
    const [popoverOpen, setPopoverOpen] = useState(false);

    const isFormValid = selectedPerson !== null || (newPerson.firstName.trim() !== "" && newPerson.lastName.trim() !== "");

    const handleAssign = () => {
        if (isFormValid) {
            onAssign(selectedPerson, newPerson);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assigner une personne au territoire</DialogTitle>
                </DialogHeader>

                {/* Sélection d'une personne existante via Popover avec Command */}
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="w-full justify-between"
                        >
                            {selectedPerson
                                ? people.find((p) => p.id === selectedPerson)?.firstName + " " + people.find((p) => p.id === selectedPerson)?.lastName
                                : "Sélectionner une personne ou aucune"}
                            <ChevronsUpDown className="opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Rechercher une personne..." className="h-9" />
                            <CommandList>
                                <CommandEmpty>Aucune personne trouvée.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="none"
                                        onSelect={() => {
                                            setSelectedPerson(null);
                                            setPopoverOpen(false);
                                        }}
                                    >
                                        Aucune personne
                                    </CommandItem>
                                    {people.map((person) => (
                                        <CommandItem
                                            key={person.id}
                                            value={`${person.firstName} ${person.lastName}`}
                                            onSelect={(currentValue) => {
                                                const selected = people.find((p) => `${p.firstName} ${p.lastName}` === currentValue);
                                                setSelectedPerson(selected ? selected.id : null);
                                                setPopoverOpen(false);
                                            }}
                                        >
                                            {person.firstName} {person.lastName}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* Création d'une nouvelle personne */}
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
                    disabled={!isFormValid}
                >
                    Confirmer l&apos;assignation
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default AssignTerritoryDialog;
