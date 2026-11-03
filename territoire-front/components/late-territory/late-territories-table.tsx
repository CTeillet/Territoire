import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/territory/territory-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableFeatures } from "@/components/ui/data-table-features";
import { Territory } from "@/models/territory";
import { DataTableColumnHeader } from "@/components/territory/territory-data-header";
import { ReminderStatusBadge } from "./reminder-status-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActionButton from "@/components/shared/action-button";
import { Eye, IterationCcw } from "lucide-react";
// import {ReminderDialog} from "@/components/late-territory/reminder-dialog";

interface LateTerritoriesTableProps {
  territories: Territory[];
  columns: ColumnDef<DataTableFeatures, Territory, unknown>[];
  tableId?: string; // Identifiant unique pour la table
}

export function LateTerritoriesTable({
  territories,
  columns,
  tableId,
}: LateTerritoriesTableProps) {
  return (
    <Card className="shadow-md border-0">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold mb-2">
          Liste des territoires en retard
        </CardTitle>
        <CardDescription className="text-base">
          Envoyez des rappels aux personnes ayant des territoires en retard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={territories} tableId={tableId} />
      </CardContent>
    </Card>
  );
}

// Helper function to create columns with formatDate, hasReminder, and sendReminder functions
// Sans onExtend (utilisateur sans droit d'attribution), pas de bouton de prolongation
export function createLateTerritoriesColumns(
  formatDate: (dateString: string | null) => string,
  hasReminder: (territory: Territory, personId: string) => boolean,
  onExtend?: (territory: Territory) => void
): ColumnDef<DataTableFeatures, Territory, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Territoire" />
      ),
    },
    {
      id: "assignedTo",
      accessorKey: "assignedTo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigné à" />
      ),
    },
    {
      id: "assignedOn",
      accessorKey: "assignedOn",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date d'assignation" />
      ),
      cell: ({ row }) => formatDate(row.original.assignedOn),
    },
    {
      id: "waitedFor",
      accessorKey: "waitedFor",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date d'échéance" />
      ),
      cell: ({ row }) => formatDate(row.original.waitedFor),
    },
    {
      id: "reminderStatus",
      header: "Statut du rappel",
      cell: ({ row }) => (
        <ReminderStatusBadge
          hasReminder={hasReminder(row.original, row.original.assignedTo)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex justify-center space-x-2">
            <ActionButton
              icon={Eye}
              tooltip="Voir les détails"
              href={`/territoires/${row.original.id}`}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            />
            {onExtend && (
              <ActionButton
                icon={IterationCcw}
                tooltip="Prolongation du territoire"
                onClick={() => onExtend(row.original)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              />
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ];
}
