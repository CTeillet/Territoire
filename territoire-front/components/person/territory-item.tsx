import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Assignment } from "@/models/assignment";
import { Button } from "@/components/ui/button";
import { TerritoryNameLink } from "@/components/territory/territory-name-link";
import { AssignmentStatusBadge } from "@/components/shared/assignment-status-badge";
import { toneSurface } from "@/components/shared/tones";

interface TerritoryItemProps {
  assignment: Assignment;
}

const TerritoryItem = ({ assignment }: TerritoryItemProps) => {
  const isCurrentAssignment = assignment.returnDate === null;
  const { territoryId, name } = assignment.territory;

  return (
    <li
      // Attribution en cours : liseré vert, comme son badge
      className={`flex flex-wrap items-center gap-3 rounded-md p-3 ${isCurrentAssignment ? `border-l-4 ${toneSurface.success}` : "bg-muted/50"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">
          <strong>Territoire :</strong>{" "}
          {territoryId ? (
            <TerritoryNameLink id={territoryId} name={name} />
          ) : (
            name
          )}
          {isCurrentAssignment && (
            <AssignmentStatusBadge assignment={assignment} className="ml-2" />
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          <span>
            Assigné le :{" "}
            {new Date(assignment.assignmentDate).toLocaleDateString()}
          </span>
          {assignment.returnDate && (
            <span className="ml-2 pl-2 border-l border-border">
              {" "}
              {assignment.returnedVia === "PROLONGATION"
                ? "Prolongé le"
                : "Retourné le"}{" "}
              : {new Date(assignment.returnDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {/* Accès direct à la fiche du territoire (le nom y mène aussi), cible de 44 px sur téléphone */}
      {territoryId && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-11 w-full bg-white sm:h-9 sm:w-auto"
        >
          <Link
            href={`/territoires/${territoryId}`}
            aria-label={`Voir le territoire ${name}`}
          >
            Voir le territoire
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </li>
  );
};

export default TerritoryItem;
