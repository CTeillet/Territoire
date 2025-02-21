"use client";

import { useState, useEffect } from "react";
import { Download, Eye, Upload } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ReturnConfirmationDialog from "@/components/territory/return-confirmation-dialog";
import ActionButton from "@/components/shared/action-button";
import { TerritoryStatus } from "@/models/territory-status";
import { useDispatch, useSelector } from "react-redux";
import {createPerson, fetchPersons } from "@/store/slices/person-slice";
import { RootState } from "@/store/store";
import {assignTerritory} from "@/store/slices/territory-slice";

interface TerritoryDataActionButtonsProps {
    territoryId: string;
    showDetails?: boolean;
    status: TerritoryStatus;
}

export function TerritoryDataActionButtons({ territoryId, status, showDetails = true }: TerritoryDataActionButtonsProps) {
    const dispatch = useDispatch();

    // ✅ Récupération des personnes depuis Redux
    const { persons, loading, error } = useSelector((state: RootState) => state.persons);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

    const showAssign = status === "AVAILABLE";
    const showReturn = status === "ASSIGNED" || status === "LATE";

    // ✅ Charger la liste des personnes au montage
    useEffect(() => {
        dispatch(fetchPersons());
    }, [dispatch]);

    // 🔹 Fonction pour gérer l'assignation d'un territoire
    const handleAssign = async (selectedPersonId: string | null, newPerson: { firstName: string; lastName: string }) => {
        try {
            let personId = selectedPersonId;

            // 🚀 Si une nouvelle personne est créée, on attend la réponse du back
            if (!selectedPersonId) {
                const createdPerson = await dispatch(createPerson(newPerson)).unwrap();
                personId = createdPerson.id;
                console.log(`✅ Nouvelle personne créée: ${createdPerson.firstName} ${createdPerson.lastName}`);
            }

            // 🚀 Maintenant qu'on a une personne valide, on assigne le territoire
            if (personId) {
                await dispatch(assignTerritory({ territoryId: territoryId, personId })).unwrap();
                console.log(`✅ Territoire ${territoryId} attribué à la personne ${personId}`);
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'assignation :", error);
        }

        setIsDialogOpen(false);
    };


    // 🔹 Fonction pour gérer le retour du territoire
    const handleReturn = () => {
        console.log(`Territoire ${territoryId} retourné dans le stock`);
        setIsReturnDialogOpen(false);
        // TODO : Appeler l'API pour retourner le territoire
    };

    return (
        <TooltipProvider>
            <div className={`flex space-x-2 ${territoryId ? "justify-center" : ""}`}>
                {showDetails && (
                    <ActionButton
                        icon={Eye}
                        tooltip="Voir les détails"
                        href={`/territoires/${territoryId}`}
                        className="bg-gray-500 hover:bg-gray-600 text-white"
                    />
                )}

                {showReturn && (
                    <ActionButton
                        icon={Download}
                        tooltip="Retour du territoire dans le stock"
                        onClick={() => setIsReturnDialogOpen(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    />
                )}

                {showAssign && (
                    <ActionButton
                        icon={Upload}
                        tooltip="Assignation du territoire"
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    />
                )}

                {/* 🔹 Affichage conditionnel de la liste des personnes */}
                {loading ? (
                    <p>Chargement des personnes...</p>
                ) : error ? (
                    <p className="text-red-500">Erreur : {error}</p>
                ) : (
                    <AssignTerritoryDialog
                        isOpen={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        people={persons} // ✅ Utilisation des données Redux
                        onAssign={handleAssign}
                    />
                )}

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
