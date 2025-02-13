import React from "react";
import {Card, CardHeader, CardTitle} from "../ui/card";
import {Table, TableBody, TableCaption, TableCell, TableHeader, TableRow} from "../ui/table";
import {Assignment} from "@/models/assignment";
import AssignmentRow from "@/components/dashboard/assignment-row";

export const AssignmentsTable: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => (
    <Card>
        <CardHeader>
            <CardTitle>Actualités des territoires</CardTitle>
        </CardHeader>
        <Table className="rounded-sm w-full text-center">
            <TableCaption></TableCaption>
            <TableHeader>
                <TableRow>
                    <TableCell className="text-center">#</TableCell>
                    <TableCell className="text-center">Statut</TableCell>
                    <TableCell className="text-center">Date Attribution</TableCell>
                    <TableCell className="text-center">Date Attendu</TableCell>
                    <TableCell className="text-center">Date Rendu</TableCell>
                    <TableCell className="text-center">Personne</TableCell>
                    <TableCell className="text-center">Actions</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assignments.map((territory) => (
                    <AssignmentRow key={territory.id} {...territory} />
                ))}
            </TableBody>
        </Table>
    </Card>
);
