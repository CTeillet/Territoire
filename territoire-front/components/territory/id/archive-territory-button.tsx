"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { archiveTerritory } from "@/lib/archive-api";

/**
 * Archivage d'un territoire qui a un historique (il ne peut pas être supprimé) : il disparaît des listes, des cartes
 * et des statistiques en cours ; son historique reste et il se restaure depuis Paramètres > Données > Archives.
 */
export function ArchiveTerritoryButton({
  territoryId,
  territoryName,
}: {
  territoryId: string;
  territoryName: string;
}) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  const archive = async () => {
    setArchiving(true);
    try {
      await archiveTerritory(territoryId);
      toast.success(`Territoire ${territoryName} archivé`);
      router.push("/territoires");
    } catch (e) {
      toast.error((e as Error).message);
      setArchiving(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={archiving}>
          <Archive aria-hidden="true" />
          Archiver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver ce territoire ?</AlertDialogTitle>
          <AlertDialogDescription>
            {territoryName} ne sera plus proposé ni compté dans les listes, les
            cartes et les statistiques. Son historique d&apos;attributions est
            gardé, et il se restaure depuis Paramètres &gt; Données &gt;
            Archives.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={archive}>Archiver</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
