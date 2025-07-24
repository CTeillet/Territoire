import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/territory/territory-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Territory } from "@/models/territory";
import { DataTableColumnHeader } from "@/components/territory/territory-data-header";
import { ReminderStatusBadge } from "./reminder-status-badge";
import { ReminderActionButton } from "./reminder-action-button";

interface LateTerritoriesTableProps {
  territories: Territory[];
  columns: ColumnDef<Territory, unknown>[];
}

export function LateTerritoriesTable({ territories, columns }: LateTerritoriesTableProps) {
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
        <DataTable columns={columns} data={territories} />
      </CardContent>
    </Card>
  );
}

// Helper function to create columns with formatDate, hasReminder, and sendReminder functions
export function createLateTerritoriesColumns(
  formatDate: (dateString: string | null) => string,
  hasReminder: (territoryId: string, personId: string) => boolean,
  sendReminder: (territoryId: string, personId: string) => void
): ColumnDef<Territory, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({column}) => (
        <DataTableColumnHeader column={column} title="Territoire" />
      ),
    },
    {
      id: "assignedTo",
      accessorKey: "assignedTo",
      header: ({column}) => (
        <DataTableColumnHeader column={column} title="Assigné à" />
      ),
    },
    {
      id: "assignedOn",
      accessorKey: "assignedOn",
      header: ({column}) => (
        <DataTableColumnHeader column={column} title="Date d'assignation" />
      ),
      cell: ({row}) => formatDate(row.original.assignedOn),
    },
    {
      id: "waitedFor",
      accessorKey: "waitedFor",
      header: ({column}) => (
        <DataTableColumnHeader column={column} title="Date d'échéance" />
      ),
      cell: ({row}) => formatDate(row.original.waitedFor),
    },
    {
      id: "reminderStatus",
      header: "Statut du rappel",
      cell: ({row}) => (
        <ReminderStatusBadge 
          hasReminder={hasReminder(row.original.id, row.original.assignedTo)} 
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}) => (
        <ReminderActionButton
          hasReminder={hasReminder(row.original.id, row.original.assignedTo)}
          onClick={() => sendReminder(row.original.id, row.original.assignedTo)}
        />
      ),
    },
  ];
}