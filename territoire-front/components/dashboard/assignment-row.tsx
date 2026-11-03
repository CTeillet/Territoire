import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Assignment } from "@/models/assignment";
import { personToString } from "@/models/person";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { TerritoryNameLink } from "@/components/territory/territory-name-link";

const getBadgeColor = (status: boolean) => {
  if (status) {
    return "bg-green-500";
  } else {
    return "bg-blue-500";
  }
};

const statusLabel = (assignment: Assignment) =>
  assignment.returnDate === null
    ? "ATTRIBUÉ"
    : assignment.returnedVia === "PROLONGATION"
      ? "PROLONGÉ"
      : "RENDU";

const holder = (assignment: Assignment) =>
  assignment.person
    ? personToString(assignment.person)
    : assignment.campaign
      ? `Campagne: ${assignment.campaign.name}`
      : "N/A";

const StatusBadge = ({ assignment }: { assignment: Assignment }) => (
  <Badge
    className={`${getBadgeColor(assignment.returnDate === null)} text-white px-2 py-1 rounded`}
  >
    {statusLabel(assignment)}
  </Badge>
);

const Actions = ({ assignment }: { assignment: Assignment }) => (
  <TerritoryDataActionButtons
    territoryId={assignment.territory.territoryId}
    status={assignment.territory.status}
    territoryMapId={assignment.territory.territoryMapId}
  />
);

const AssignmentRow: React.FC<Assignment> = (assignment: Assignment) => (
  <TableRow>
    <TableCell className="text-center">
      <TerritoryNameLink
        id={assignment.territory.territoryId}
        name={assignment.territory.name}
      />
    </TableCell>
    <TableCell>
      <StatusBadge assignment={assignment} />
    </TableCell>
    <TableCell className="text-center">{assignment.assignmentDate}</TableCell>
    <TableCell className="text-center">
      {assignment.dueDate !== null ? assignment.dueDate : "N/A"}
    </TableCell>
    <TableCell className="text-center">
      {assignment.returnDate !== null ? assignment.returnDate : "N/A"}
    </TableCell>
    <TableCell className="text-center">{holder(assignment)}</TableCell>
    <TableCell>
      <Actions assignment={assignment} />
    </TableCell>
  </TableRow>
);

// Téléphone : une carte par attribution plutôt qu'un tableau à faire défiler de côté
export const AssignmentCard: React.FC<Assignment> = (
  assignment: Assignment
) => (
  <li className="rounded-lg border bg-white p-3 text-sm text-gray-700 shadow-sm">
    <div className="mb-1 flex items-center justify-between gap-2">
      <TerritoryNameLink
        id={assignment.territory.territoryId}
        name={assignment.territory.name}
      />
      <StatusBadge assignment={assignment} />
    </div>
    <p className="font-medium text-gray-900">{holder(assignment)}</p>
    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
      <dt className="text-gray-500">Attribué le</dt>
      <dd>{assignment.assignmentDate}</dd>
      {assignment.dueDate !== null && (
        <>
          <dt className="text-gray-500">À rendre le</dt>
          <dd>{assignment.dueDate}</dd>
        </>
      )}
      {assignment.returnDate !== null && (
        <>
          <dt className="text-gray-500">Rendu le</dt>
          <dd>{assignment.returnDate}</dd>
        </>
      )}
    </dl>
    <div className="mt-3 border-t pt-3">
      <Actions assignment={assignment} />
    </div>
  </li>
);

export default AssignmentRow;
