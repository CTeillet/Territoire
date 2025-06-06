"use client";

import { CampaignStatistics } from "@/models/campaign-statistics";
import { TerritoryType } from "@/models/territory-type";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table";
import { TableWrapper } from "@/components/shared/ui/table-wrapper";
import { TerritoryTypeRow } from "./territory-type-row";

interface StatisticsTableProps {
  statistics: CampaignStatistics;
  typeTranslations: Record<TerritoryType, string>;
}

export function StatisticsTable({ statistics, typeTranslations }: StatisticsTableProps) {
  return (
    <TableWrapper title="Détails par type de territoire">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="border p-3 text-left">Type de territoire</TableHead>
            <TableHead className="border p-3 text-center">Total</TableHead>
            <TableHead className="border p-3 text-center">Utilisés</TableHead>
            <TableHead className="border p-3 text-center">Disponibles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TerritoryTypeRow
            typeName={typeTranslations[TerritoryType.BUILDING]}
            totalCount={statistics.totalTerritoriesByType[TerritoryType.BUILDING] || 0}
            usedCount={statistics.usedTerritoriesByType[TerritoryType.BUILDING] || 0}
            availableCount={statistics.availableTerritoriesByType[TerritoryType.BUILDING] || 0}
          />
          <TerritoryTypeRow
            typeName={typeTranslations[TerritoryType.HOUSE]}
            totalCount={statistics.totalTerritoriesByType[TerritoryType.HOUSE] || 0}
            usedCount={statistics.usedTerritoriesByType[TerritoryType.HOUSE] || 0}
            availableCount={statistics.availableTerritoriesByType[TerritoryType.HOUSE] || 0}
          />
          <TerritoryTypeRow
            typeName="Total"
            totalCount={statistics.totalTerritories}
            usedCount={statistics.usedTerritories}
            availableCount={statistics.availableTerritories}
            isTotal={true}
          />
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
