"use client";

import React, { useState } from "react";
import { UserMinus } from "lucide-react";
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
import { Person } from "@/models/person";
import { canManagePersons } from "@/models/role";
import { archivePerson } from "@/lib/archive-api";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchPersons } from "@/store/slices/person-slice";

/**
 * Personne partie (déménagement...) : archivée plutôt que supprimée, elle quitte les listes et les choix
 * d'attribution, son lien personnel est révoqué et son historique reste.
 */
export function ArchivePersonButton({
  person,
  onArchived,
}: {
  person: Person;
  onArchived: () => void;
}) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.auth.user?.role);
  const [archiving, setArchiving] = useState(false);

  if (!canManagePersons(role) || person.id == null) return null;
  const personId = person.id;

  const archive = async () => {
    setArchiving(true);
    try {
      await archivePerson(personId);
      toast.success(`${person.firstName} ${person.lastName} archivé(e)`);
      dispatch(fetchPersons());
      onArchived();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={archiving}>
          <UserMinus aria-hidden="true" />
          Marquer comme partie
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {person.firstName} {person.lastName} est partie ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Elle ne sera plus dans la liste des personnes ni proposée pour une
            attribution, et son lien personnel ne fonctionnera plus. Son
            historique d&apos;attributions est gardé ; elle se restaure depuis
            Paramètres &gt; Données &gt; Archives.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={archive}>
            Marquer comme partie
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
