import React from "react";
import {TableCell, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {Assignment} from "@/models/assignment";
import {personToString} from "@/models/person";
import {TerritoryDataActionButtons} from "@/components/shared/territory-data-action-buttons";

const getBadgeColor = (status: boolean) => {
    if (status) {
        return "bg-green-500";
    } else {
        return "bg-blue-500";
    }
};

const AssignmentRow: React.FC<Assignment> = (assignment: Assignment) => (
    <TableRow>
        <TableCell className="text-center">{assignment.territory?.name}</TableCell>
        <TableCell >
            <Badge className={`${getBadgeColor(assignment.returnDate === null)} text-white px-2 py-1 rounded w-full `}>
                {assignment.returnDate === null ? "ATTRIBUÉ" : "RENDU"}
            </Badge>
        </TableCell>
        <TableCell className="text-center">{assignment.assignmentDate}</TableCell>
        <TableCell
            className="text-center">{(assignment.dueDate !== null) ? assignment.dueDate : "N/A"}</TableCell>
        <TableCell
            className="text-center">{(assignment.returnDate !== null) ? assignment.returnDate : "N/A"}</TableCell>
        <TableCell className="text-center">
            {assignment.person ? personToString(assignment.person) : 
             assignment.campaign ? `Campagne: ${assignment.campaign.name}` : "N/A"}
        </TableCell>
        <TableCell >
            <TerritoryDataActionButtons territoryId={assignment.territory.territoryId} status={assignment.territory.status}/>
        </TableCell>
    </TableRow>
);

export default AssignmentRow;
