"use client";

import { CampaignStatistics } from "@/models/campaign-statistics";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/components/ui/table";
import { TableWrapper } from "@/components/shared/ui/table-wrapper";
import { TerritoryTypeRow } from "./territory-type-row";

interface CityStatisticsTableProps {
  statistics: CampaignStatistics;
}

export function CityStatisticsTable({ statistics }: CityStatisticsTableProps) {
  // Get unique city names from the statistics
  const cityNames = Object.keys(statistics.totalTerritoriesByCity || {}).sort();

  return (
    <TableWrapper title="Détails par ville">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="border p-3 text-left">Ville</TableHead>
            <TableHead className="border p-3 text-center">Total</TableHead>
            <TableHead className="border p-3 text-center">Utilisés</TableHead>
            <TableHead className="border p-3 text-center">Disponibles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cityNames.map((cityName) => (
            <TerritoryTypeRow
              key={cityName}
              typeName={cityName}
              totalCount={statistics.totalTerritoriesByCity[cityName] || 0}
              usedCount={statistics.usedTerritoriesByCity[cityName] || 0}
              availableCount={statistics.availableTerritoriesByCity[cityName] || 0}
            />
          ))}
          {cityNames.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center p-4 text-muted-foreground">
                Aucune donnée par ville disponible
              </TableCell>
            </TableRow>
          )}
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
