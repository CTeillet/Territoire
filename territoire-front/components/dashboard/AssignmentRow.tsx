import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Assignment} from "@/models/assignment";
import {personToString} from "@/models/person";

const getBadgeColor = (status: boolean) => {
    if (status) {
        return "bg-green-500";
    } else {
        return "bg-blue-500";
    }
};

export const AssignmentRow: React.FC<Assignment>  = (assignment: Assignment ) => (
    <TableRow>
        <TableCell>{assignment.territory.name}</TableCell>
        <TableCell>
            <Badge className={`${getBadgeColor(assignment.returnDate === null)} text-white px-2 py-1 rounded`}>{ (assignment.returnDate === null)?"ATTRIBUÉ":"RENDUE" }</Badge>
        </TableCell>
        <TableCell>{Intl.DateTimeFormat().format(assignment.assignmentDate) }</TableCell>
        <TableCell>{ (assignment.dueDate !== null)? Intl.DateTimeFormat().format(assignment.dueDate) : "N/A"}</TableCell>
        <TableCell>{ (assignment.returnDate !== null)? Intl.DateTimeFormat().format(assignment.returnDate) : "N/A"}</TableCell>
        <TableCell>{personToString(assignment.person)}</TableCell>
        <TableCell>
            <Button>Voir territoire</Button>
        </TableCell>
    </TableRow>
);
