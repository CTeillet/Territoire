import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import AssignmentRow, {
  AssignmentCard,
} from "@/components/dashboard/assignment-row";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchLatestAssignments } from "@/store/slices/territory-slice";

export const AssignmentsTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const { latestAssignments, statisticsLoading, error } = useSelector(
    (state: RootState) => state.territories
  );

  useEffect(() => {
    dispatch(fetchLatestAssignments());
  }, [dispatch]);

  if (statisticsLoading) return <p>Chargement...</p>;
  if (error) return <p>Erreur: {error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actualités des territoires</CardTitle>
      </CardHeader>
      {isMobile ? (
        <ul className="space-y-3 px-4 pb-4">
          {latestAssignments.map((assignment) => (
            <AssignmentCard key={assignment.id} {...assignment} />
          ))}
        </ul>
      ) : (
        <div className="max-h-[450px] overflow-auto pb-2">
          <Table className="rounded-sm w-full text-center">
            <TableCaption></TableCaption>
            <TableHeader className="sticky top-0 bg-background z-10">
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
              {latestAssignments.map((assignment) => (
                <AssignmentRow key={assignment.id} {...assignment} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
