import React from "react";
import {Card, CardHeader, CardTitle} from "../ui/card";
import {Table, TableBody, TableCaption, TableCell, TableHeader, TableRow} from "../ui/table";
import {AssignmentRow} from "@/components/dashboard/AssignmentRow";
import {Assignment} from "@/models/assignment";

export const TerritoriesTable: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => (
    <Card>
        <CardHeader>
            <CardTitle>Actualités des territoires</CardTitle>
        </CardHeader>
        <Table className="rounded-sm">
            <TableCaption></TableCaption>
            <TableHeader>
                <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date Attribution</TableCell>
                    <TableCell>Date Attendu</TableCell>
                    <TableCell>Date Rendu</TableCell>
                    <TableCell>Personne</TableCell>
                    <TableCell>Actions</TableCell>
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
