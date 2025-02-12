import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Assignment} from "@/models/assignment";
import {personToString} from "@/models/person";
import {Eye} from "lucide-react";

const getBadgeColor = (status: boolean) => {
    if (status) {
        return "bg-green-500";
    } else {
        return "bg-blue-500";
    }
};

export const AssignmentRow: React.FC<Assignment>  = (assignment: Assignment ) => (
    <TableRow>
        <TableCell className="text-center">{assignment.territory.name}</TableCell>
        <TableCell className="flex justify-center">
            <Badge className={`${getBadgeColor(assignment.returnDate === null)} text-white px-2 py-1 rounded`}>
                {assignment.returnDate === null ? "ATTRIBUÉ" : "RENDUE"}
            </Badge>
        </TableCell>
        <TableCell className="text-center">{Intl.DateTimeFormat().format(assignment.assignmentDate)}</TableCell>
        <TableCell className="text-center">{(assignment.dueDate !== null) ? Intl.DateTimeFormat().format(assignment.dueDate) : "N/A"}</TableCell>
        <TableCell className="text-center">{(assignment.returnDate !== null) ? Intl.DateTimeFormat().format(assignment.returnDate) : "N/A"}</TableCell>
        <TableCell className="text-center">{personToString(assignment.person)}</TableCell>
        <TableCell className="text-center">
            <Button><Eye/></Button>
        </TableCell>
    </TableRow>
);
