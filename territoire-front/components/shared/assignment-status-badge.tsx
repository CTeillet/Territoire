import { Badge } from "@/components/ui/badge";
import { Assignment } from "@/models/assignment";

/** État d'une attribution, le même au tableau de bord et sur la fiche d'une personne. */
export function AssignmentStatusBadge({
  assignment,
  className,
}: {
  assignment: Pick<Assignment, "returnDate" | "returnedVia">;
  className?: string;
}) {
  if (assignment.returnDate === null) {
    return (
      <Badge variant="success" className={className}>
        En cours
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" className={className}>
      {assignment.returnedVia === "PROLONGATION" ? "Prolongé" : "Rendu"}
    </Badge>
  );
}
