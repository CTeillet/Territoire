import React, {useEffect, useState} from "react";
import {Card, CardHeader, CardTitle} from "../ui/card";
import {Table, TableBody, TableCaption, TableCell, TableHeader, TableRow} from "../ui/table";
import {Assignment} from "@/models/assignment";
import AssignmentRow from "@/components/dashboard/assignment-row";

export const AssignmentsTable: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const response = await fetch("/api/attributions/dernieres");

                // 🔹 Vérifie si la requête à échouer et retourne immédiatement une erreur
                if (!response.ok) {
                    setError("Erreur lors du chargement des assignments");
                    return;
                }

                try {
                    const data = await response.json();
                    setAssignments(data);
                } catch (error) {
                    setError(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    if (loading) return <p>Chargement...</p>;
    if (error) return <p>Erreur: {error}</p>;

    return (
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
                    {assignments.map((assignment) => (
                        <AssignmentRow key={assignment.id} {...assignment} />
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
};
