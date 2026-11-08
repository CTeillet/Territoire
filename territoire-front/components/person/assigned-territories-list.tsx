import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Assignment, compareByMostRecent } from "@/models/assignment";
import React from "react";
import TerritoryItem from "./territory-item";

interface AssignedTerritoriesListProps {
  assignedTerritories: Assignment[];
  loadingAssignedTerritories: boolean;
  /** Action à côté du titre (ex. attribuer un territoire). */
  action?: React.ReactNode;
}

const AssignedTerritoriesList = ({
  assignedTerritories,
  loadingAssignedTerritories,
  action,
}: AssignedTerritoriesListProps) => {
  const sortedTerritories = [...assignedTerritories].sort(compareByMostRecent);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Territoires assignés</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        {loadingAssignedTerritories ? (
          <p className="text-center py-4">Chargement des territoires...</p>
        ) : sortedTerritories.length > 0 ? (
          <ul className="space-y-4">
            {sortedTerritories.map((assignment) => (
              <TerritoryItem key={assignment.id} assignment={assignment} />
            ))}
          </ul>
        ) : (
          <p className="text-center py-4 text-muted-foreground">
            Aucun territoire assigné
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignedTerritoriesList;
