"use client";

import {useState} from "react";
import {Download, Eye, Upload} from "lucide-react";
import {TooltipProvider} from "@/components/ui/tooltip";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ReturnConfirmationDialog from "@/components/territory/return-confirmation-dialog";
import ActionButton from "@/components/shared/action-button";
import {Person} from "@/models/person";
import {TerritoryStatus} from "@/models/territory-status";

interface TerritoryDataActionButtonsProps {
    id: string;
    people: Person[];
    showDetails?: boolean;
    status: TerritoryStatus;
}

export function TerritoryDataActionButtons(
    {
        id,
        people,
        status,
        showDetails = true
    }: TerritoryDataActionButtonsProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const showAssign = status === "AVAILABLE";
        const showReturn = status === "ASSIGNED" || status === "LATE";

    // Fonction pour gérer l'assignation d'un territoire
    const handleAssign = (personId: string | null) => {
        console.log(`Territoire ${id} assigné à la personne ${personId}`);
        setIsDialogOpen(false);
        //TODO : appeler l'API pour assigner le territoire
    };

    // Fonction pour gérer le retour du territoire dans le stock
    const handleReturn = () => {
        console.log(`Territoire ${id} retourné dans le stock`);
        setIsReturnDialogOpen(false);
        //TODO : appeler l'API pour retourner le territoire
    };

    return (
        <TooltipProvider>
            <div className={`flex space-x-2 ${id ? "justify-center" : ""}`}>
                {showDetails && (
                    <ActionButton
                        icon={Eye}
                        tooltip="Voir les détails"
                        href={`/territoires/${id}`}
                        className="bg-gray-500 hover:bg-gray-600 text-white"
                    />
                )}

                {showReturn &&
                    (<ActionButton
                            icon={Download}
                            tooltip="Retour du territoire dans le stock"
                            onClick={() => setIsReturnDialogOpen(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        />
                    )}

                {showAssign &&
                    (<ActionButton
                        icon={Upload}
                        tooltip="Assignation du territoire"
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    />)
                }

                {/* Fenêtre de dialogue d'assignation */}
                <AssignTerritoryDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    people={people}
                    onAssign={handleAssign}
                />

                {/* Fenêtre de dialogue de confirmation de retour */}
                <ReturnConfirmationDialog
                    isOpen={isReturnDialogOpen}
                    onClose={() => setIsReturnDialogOpen(false)}
                    onConfirm={handleReturn}
                />
            </div>
        </TooltipProvider>
    );
}
