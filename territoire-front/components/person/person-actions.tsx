import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Ban, Edit, Save, Undo2 } from "lucide-react";
import { Person } from "@/models/person";
import DeletePersonButton from "./delete-person-button";

interface PersonActionsProps {
  person: Person;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDeleted: () => void;
}

const PersonActions = ({
  person,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDeleted,
}: PersonActionsProps) => {
  return (
    <div className="flex gap-4">
      {editing ? (
        <>
          <Button
            className="bg-green-500"
            onClick={onSave}
            aria-label="Sauvegarder"
          >
            <Save />
          </Button>
          <Button
            className="bg-gray-500"
            onClick={onCancel}
            aria-label="Annuler"
          >
            <Ban />
          </Button>
        </>
      ) : (
        <>
          <Button onClick={onEdit} aria-label="Modifier">
            <Edit />
          </Button>
          <DeletePersonButton person={person} onDeleted={onDeleted} />
        </>
      )}
      <Link href="/personnes" aria-label="Retour à la liste des personnes">
        <Button className="bg-gray-500" tabIndex={-1}>
          <Undo2 />
        </Button>
      </Link>
    </div>
  );
};

export default PersonActions;
