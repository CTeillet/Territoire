"use client";

import { TableRow, TableCell } from "@/components/ui/table";

interface TerritoryTypeRowProps {
  typeName: string;
  totalCount: number;
  usedCount: number;
  availableCount: number;
  isTotal?: boolean;
}

/**
 * A component for displaying a row in the statistics table for a specific territory type
 */
export function TerritoryTypeRow({ 
  typeName, 
  totalCount, 
  usedCount, 
  availableCount,
  isTotal = false
}: TerritoryTypeRowProps) {
  return (
    <TableRow className={isTotal ? "bg-gray-50 font-semibold" : ""}>
      <TableCell className="border p-3 font-medium">
        {typeName}
      </TableCell>
      <TableCell className="border p-3 text-center">
        {totalCount}
      </TableCell>
      <TableCell className="border p-3 text-center">
        {usedCount}
      </TableCell>
      <TableCell className="border p-3 text-center">
        {availableCount}
      </TableCell>
    </TableRow>
  );
}
