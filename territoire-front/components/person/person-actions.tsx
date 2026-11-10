import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import { Person } from "@/models/person";
import DeletePersonButton from "./delete-person-button";
import { ArchivePersonButton } from "./archive-person-button";

interface PersonActionsProps {
  person: Person;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDeleted: () => void;
}

/** Actions de la fiche d'une personne, dans son en-tête : les mêmes boutons libellés que sur les autres fiches. */
const PersonActions = ({
  person,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDeleted,
}: PersonActionsProps) =>
  editing ? (
    <>
      <Button onClick={onSave}>
        <Save aria-hidden="true" />
        Enregistrer
      </Button>
      <Button variant="outline" onClick={onCancel}>
        <X aria-hidden="true" />
        Annuler
      </Button>
    </>
  ) : (
    <>
      <Button variant="outline" onClick={onEdit}>
        <Pencil aria-hidden="true" />
        Modifier
      </Button>
      <ArchivePersonButton person={person} onArchived={onDeleted} />
      <DeletePersonButton person={person} onDeleted={onDeleted} showLabel />
    </>
  );

export default PersonActions;
