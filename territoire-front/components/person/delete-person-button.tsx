"use client";

import React from "react";
import { Trash2 } from "lucide-react";
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
import { useAppDispatch, useAppSelector } from "@/store/store";
import { deletePerson } from "@/store/slices/person-slice";

interface DeletePersonButtonProps {
  person: Person;
  className?: string;
  onDeleted?: () => void;
}

/** Bouton de suppression avec confirmation, réservé aux rôles autorisés par l'API. */
const DeletePersonButton: React.FC<DeletePersonButtonProps> = ({
  person,
  className,
  onDeleted,
}) => {
  const dispatch = useAppDispatch();
  const deleting = useAppSelector((state) => state.persons.deleting);
  const role = useAppSelector((state) => state.auth.user?.role);

  if (!canManagePersons(role)) return null;

  const handleDelete = async () => {
    if (person.id == null) return;
    try {
      await dispatch(deletePerson(person.id)).unwrap();
      onDeleted?.();
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : "Échec de la suppression"
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className={className}
          disabled={deleting}
          aria-label={`Supprimer ${person.firstName} ${person.lastName}`}
        >
          {deleting ? "Suppression..." : <Trash2 size={18} />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer{" "}
            <b>
              {person.firstName} {person.lastName}
            </b>{" "}
            ?<br />
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end gap-2">
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePersonButton;
