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
        <TableCell className="flex justify-center">
            <Badge className={`${getBadgeColor(assignment.returnDate === null)} text-white px-2 py-1 rounded w-full `}>
                {assignment.returnDate === null ? "ATTRIBUÉ" : "RENDUE"}
            </Badge>
        </TableCell>
        <TableCell className="text-center">{Intl.DateTimeFormat().format(assignment.assignmentDate)}</TableCell>
        <TableCell
            className="text-center">{(assignment.dueDate !== null) ? Intl.DateTimeFormat().format(assignment.dueDate) : "N/A"}</TableCell>
        <TableCell
            className="text-center">{(assignment.returnDate !== null) ? Intl.DateTimeFormat().format(assignment.returnDate) : "N/A"}</TableCell>
        <TableCell className="text-center">{personToString(assignment.person)}</TableCell>
        <TableCell className="text-center">
            <TerritoryDataActionButtons id={assignment.territory.id} status={assignment.territory.status}/>
        </TableCell>
    </TableRow>
);

export default AssignmentRow;
