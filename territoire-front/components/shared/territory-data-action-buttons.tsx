"use client";

import {useEffect, useState} from "react";
import {Download, Eye, IterationCcw, Upload} from "lucide-react";
import {TooltipProvider} from "@/components/ui/tooltip";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ReturnConfirmationDialog from "@/components/territory/return-confirmation-dialog";
import ActionButton from "@/components/shared/action-button";
import {TerritoryStatus} from "@/models/territory-status";
import {useSelector} from "react-redux";
import {createPerson, fetchPersons} from "@/store/slices/person-slice";
import {RootState, useAppDispatch} from "@/store/store";
import {assignTerritory, extendTerritory, returnTerritory} from "@/store/slices/territory-slice";
import {Person} from "@/models/person";
import ExtendConfirmationDialog from "@/components/territory/extend-confirmation-dialog";

interface TerritoryDataActionButtonsProps {
    territoryId: string;
    showDetails?: boolean;
    status: TerritoryStatus;
}

export function TerritoryDataActionButtons({territoryId, status, showDetails = true}: TerritoryDataActionButtonsProps) {
    const dispatch = useAppDispatch();
    const user = useSelector((state: RootState) => state.auth.user);


    // ✅ Récupération des personnes depuis Redux
    const {persons, loading, error} = useSelector((state: RootState) => state.persons);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);

    const showAssign = status === "AVAILABLE";
    const showReturn = status === "ASSIGNED" || status === "LATE";

    // ✅ Charger la liste des personnes au montage
    useEffect(() => {
        if(!persons) {
            console.log("Récupération des personnes...");
            dispatch(fetchPersons());
        }
    }, [dispatch, persons]);

    // 🔹 Fonction pour gérer l'assignation d'un territoire
    const handleAssign = async (selectedPersonId: string | null, newPerson: {
        firstName: string;
        lastName: string
    }) => {
        try {
            let personId = selectedPersonId;

            // Si une nouvelle personne est créée, on attend la réponse du backend
            if (!selectedPersonId) {
                const createdPerson: Person = await dispatch(createPerson(newPerson)).unwrap();
                personId = createdPerson.id;
                console.log(`✅ Nouvelle personne créée: ${createdPerson.firstName} ${createdPerson.lastName}`);
            }

            if (personId) {
                await dispatch(assignTerritory({territoryId: territoryId, personId})).unwrap();
                console.log(`✅ Territoire ${territoryId} attribué à la personne ${personId}`);
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'assignation :", error);
        }

        setIsDialogOpen(false);
    };


    // 🔹 Fonction pour gérer le retour du territoire
    const handleReturn = async () => {
        try {
            await dispatch(returnTerritory(territoryId)).unwrap();
            console.log(`✅ Territoire ${territoryId} retourné avec succès`);
        } catch (error) {
            console.error("❌ Erreur lors du retour du territoire :", error);
        }
        setIsReturnDialogOpen(false);
    };

    const handleExtension = async () => {
        try {
            await dispatch(extendTerritory(territoryId)).unwrap();
            console.log(`✅ Territoire ${territoryId} prolongé avec succès`);
        } catch (error) {
            console.error("❌ Erreur lors de la prolongation du territoire :", error);
        }
    }

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

                {showReturn && (user?.role === "ADMIN" || user?.role === "SUPERVISEUR" || user?.role === "GESTIONNAIRE") && (
                    <ActionButton
                        icon={Download}
                        tooltip="Retour du territoire dans le stock"
                        onClick={() => setIsReturnDialogOpen(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    />
                )}

                {showAssign && (user?.role === "ADMIN" || user?.role === "SUPERVISEUR" || user?.role === "GESTIONNAIRE") && (
                    <ActionButton
                        icon={Upload}
                        tooltip="Assignation du territoire"
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    />
                )}

                {showReturn && (user?.role === "ADMIN" || user?.role === "SUPERVISEUR" || user?.role === "GESTIONNAIRE") && (
                    <ActionButton
                        icon={IterationCcw}
                        tooltip={"Prolongation du territoire"}
                        onClick={() => setIsExtendDialogOpen(true)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
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

                {/* Fenêtre de dialogue de confirmation de prolongation */}
                <ExtendConfirmationDialog
                    isOpen={isExtendDialogOpen}
                    onClose={() => setIsExtendDialogOpen(false)}
                    onConfirm={handleExtension}
                />
            </div>
        </TooltipProvider>
    );
}
