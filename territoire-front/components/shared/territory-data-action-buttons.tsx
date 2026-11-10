"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarPlus,
  CircleCheck,
  Ellipsis,
  Eye,
  FileCheck,
  FileImage,
  FileX,
  ImageUp,
  Undo2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ReturnConfirmationDialog from "@/components/territory/return-confirmation-dialog";
import { TerritoryStatus } from "@/models/territory-status";
import { useSelector } from "react-redux";
import { createPerson, fetchPersons } from "@/store/slices/person-slice";
import { RootState, useAppDispatch } from "@/store/store";
import {
  assignTerritory,
  cancelAssignment,
  extendTerritory,
  makeTerritoryAvailable,
  returnTerritory,
  updateTerritoryLost,
} from "@/store/slices/territory-slice";
import { Person } from "@/models/person";
import ExtendConfirmationDialog from "@/components/territory/extend-confirmation-dialog";
import CancelAssignmentDialog from "@/components/territory/cancel-assignment-dialog";
import MakeAvailableDialog from "@/components/territory/make-available-dialog";
import { authFetch } from "@/utils/auth-fetch";
import { canManageAssignments, canManageTerritoryCards } from "@/models/role";
import { labelAfterAssignment } from "@/components/shared/assignment-label-file";

interface TerritoryDataActionButtonsProps {
  territoryId: string;
  showDetails?: boolean;
  status: TerritoryStatus;
  territoryMapId?: string;
  lost?: boolean;
  className?: string;
}

export function TerritoryDataActionButtons({
  territoryId,
  status,
  territoryMapId,
  lost = false,
  showDetails = true,
  className,
}: TerritoryDataActionButtonsProps) {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // ✅ Récupération des personnes depuis Redux
  const { persons, loading, error, isFetchingPersons } = useSelector(
    (state: RootState) => state.persons
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isMakeAvailableDialogOpen, setIsMakeAvailableDialogOpen] =
    useState(false);

  // Référence pour l'input de fichier caché
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = canManageAssignments(user?.role);
  const canUploadMap = canManageTerritoryCards(user?.role);
  const showAssign = canManage && status === "AVAILABLE";
  const showReturn = canManage && (status === "ASSIGNED" || status === "LATE");
  // Sans attendre la fin de la durée d'attente (traitement de nuit)
  const showMakeAvailable = canManage && status === "PENDING";

  useEffect(() => {
    if (persons.length === 0 && !isFetchingPersons) {
      dispatch(fetchPersons());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Exécute le useEffect une seule fois au montage

  // 🔹 Fonction pour gérer l'assignation d'un territoire
  const handleAssign = async (
    selectedPersonId: string | null,
    newPerson: {
      firstName: string;
      lastName: string;
    }
  ) => {
    try {
      let personId = selectedPersonId;

      // Si une nouvelle personne est créée, on attend la réponse du backend
      if (!selectedPersonId) {
        const createdPerson: Person = await dispatch(
          createPerson(newPerson)
        ).unwrap();
        personId = createdPerson.id;
      }

      if (personId) {
        const assignment = await dispatch(
          assignTerritory({ territoryId: territoryId, personId })
        ).unwrap();
        void labelAfterAssignment(assignment);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'assignation :", error);
      toast.error(String(error));
    }

    setIsDialogOpen(false);
  };

  // Les fenêtres de confirmation se ferment avant l'appel : le tableau reste affiché
  // pendant l'enregistrement, un second clic enverrait l'action deux fois

  // 🔹 Fonction pour gérer le retour du  territoire
  const handleReturn = async () => {
    setIsReturnDialogOpen(false);
    try {
      await dispatch(returnTerritory(territoryId)).unwrap();
    } catch (error) {
      console.error("❌ Erreur lors du retour du territoire :", error);
      toast.error(String(error));
    }
  };

  // 🔹 Fonction pour gérer l'annulation de l'assignation
  const handleCancelAssignment = async () => {
    setIsCancelDialogOpen(false);
    try {
      await dispatch(cancelAssignment(territoryId)).unwrap();
    } catch (error) {
      console.error("❌ Erreur lors de l'annulation de l'assignation :", error);
      toast.error(String(error));
    }
  };

  const handleMakeAvailable = async () => {
    setIsMakeAvailableDialogOpen(false);
    try {
      await dispatch(makeTerritoryAvailable(territoryId)).unwrap();
      toast.success("Territoire disponible : il peut être attribué.");
    } catch (error) {
      console.error(
        "❌ Erreur lors de la remise à disposition du territoire :",
        error
      );
      toast.error(String(error));
    }
  };

  const handleExtension = async (dueDate?: string) => {
    setIsExtendDialogOpen(false);
    try {
      await dispatch(extendTerritory({ territoryId, dueDate })).unwrap();
    } catch (error) {
      console.error("❌ Erreur lors de la prolongation du territoire :", error);
      toast.error(String(error));
    }
  };

  // Sans confirmation : l'action se défait d'un clic sur le même bouton
  const handleToggleLost = async () => {
    try {
      await dispatch(
        updateTerritoryLost({ territoryId, lost: !lost })
      ).unwrap();
      toast.success(
        lost
          ? "Territoire retiré des perdus."
          : "Territoire signalé perdu : il sera proposé à la réimpression."
      );
    } catch (error) {
      toast.error(String(error));
    }
  };

  // Fonction pour ouvrir l'explorateur de fichiers
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fonction pour gérer l'upload de la carte du territoire
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authFetch(
        `/api/territoires/${territoryId}/carte`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        // Recharger la page pour voir les changements
        window.location.reload();
      } else {
        console.error(
          "❌ Erreur lors du téléchargement de la carte du territoire"
        );
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors du téléchargement de la carte du territoire:",
        error
      );
    }

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Fonction pour ouvrir la carte du territoire dans un nouvel onglet avec authentification
  const handleViewMap = async () => {
    try {
      // Utiliser authFetch pour récupérer la carte avec authentification
      const response = await authFetch(`/api/territoires/${territoryId}/carte`);

      if (!response.ok) {
        console.error(
          "❌ Erreur lors de la récupération de la carte du territoire"
        );
        return;
      }

      // Récupérer les données binaires de l'image
      const blob = await response.blob();

      // Créer une URL pour le blob
      const url = URL.createObjectURL(blob);

      // Ouvrir l'URL dans un nouvel onglet
      window.open(url, "_blank");

      // Libérer l'URL de l'objet après ouverture
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération de la carte du territoire:",
        error
      );
    }
  };

  // Le menu regroupe le reste par usage : consulter, gérer, puis l'action destructive à part
  const viewItems = [
    showDetails && (
      <DropdownMenuItem key="details" asChild>
        <Link href={`/territoires/${territoryId}`}>
          <Eye />
          Voir les détails
        </Link>
      </DropdownMenuItem>
    ),
    territoryMapId && (
      <DropdownMenuItem key="map" onSelect={handleViewMap}>
        <FileImage />
        Voir la carte
      </DropdownMenuItem>
    ),
  ].filter(Boolean);

  const manageItems = [
    showMakeAvailable && (
      <DropdownMenuItem
        key="make-available"
        onSelect={() => setIsMakeAvailableDialogOpen(true)}
      >
        <CircleCheck />
        Rendre disponible
      </DropdownMenuItem>
    ),
    showReturn && (
      <DropdownMenuItem
        key="extend"
        onSelect={() => setIsExtendDialogOpen(true)}
      >
        <CalendarPlus />
        Prolonger
      </DropdownMenuItem>
    ),
    canManage && (
      <DropdownMenuItem key="lost" onSelect={handleToggleLost}>
        {lost ? <FileCheck /> : <FileX />}
        {lost ? "Retirer des territoires perdus" : "Signaler comme perdu"}
      </DropdownMenuItem>
    ),
    canUploadMap && (
      <DropdownMenuItem key="upload" onSelect={handleUploadClick}>
        <ImageUp />
        {territoryMapId ? "Remplacer la carte" : "Importer une carte"}
      </DropdownMenuItem>
    ),
  ].filter(Boolean);

  const dangerItems = [
    showReturn && (
      <DropdownMenuItem
        key="cancel"
        variant="destructive"
        onSelect={() => setIsCancelDialogOpen(true)}
      >
        <Ban />
        Annuler l&apos;assignation
      </DropdownMenuItem>
    ),
  ].filter(Boolean);

  const menuGroups = [viewItems, manageItems, dangerItems].filter(
    (items) => items.length > 0
  );

  // Sur téléphone, cibles de 44 px et action principale sur toute la largeur
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {showAssign && (
        <Button
          className="h-11 max-md:flex-1 md:h-8"
          onClick={() => setIsDialogOpen(true)}
        >
          <UserPlus />
          Assigner
        </Button>
      )}

      {showReturn && (
        <Button
          className="h-11 max-md:flex-1 md:h-8"
          onClick={() => setIsReturnDialogOpen(true)}
        >
          <Undo2 />
          Retour en stock
        </Button>
      )}

      {menuGroups.length > 0 && (
        // Non modal : les fenêtres de confirmation s'ouvrent depuis le menu sans bloquer la page
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="size-11 md:size-8"
              aria-label="Plus d'actions"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          {/* Au-dessus des popups Leaflet (z-index 700) quand le menu s'ouvre depuis la carte */}
          <DropdownMenuContent align="end" className="z-[1100] min-w-52">
            {menuGroups.map((items, index) => (
              <React.Fragment key={index}>
                {index > 0 && <DropdownMenuSeparator />}
                {items}
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Input file caché pour l'upload de la carte */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* 🔹 Affichage conditionnel de la liste des personnes */}
      {loading ? (
        <p>Chargement des personnes...</p>
      ) : error ? (
        <p className="text-destructive">Erreur : {error}</p>
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

      {/* Fenêtre de dialogue de confirmation d'annulation d'assignation */}
      <CancelAssignmentDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelAssignment}
      />

      {/* Fenêtre de dialogue de confirmation de remise à disposition */}
      <MakeAvailableDialog
        isOpen={isMakeAvailableDialogOpen}
        onClose={() => setIsMakeAvailableDialogOpen(false)}
        onConfirm={handleMakeAvailable}
      />
    </div>
  );
}
