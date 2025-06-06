"use client";

import { CampaignStatistics } from "@/models/campaign-statistics";
import { TerritoryType } from "@/models/territory-type";

interface StatisticsTableProps {
  statistics: CampaignStatistics;
  typeTranslations: Record<TerritoryType, string>;
}

export function StatisticsTable({ statistics, typeTranslations }: StatisticsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-3 text-left">Type de territoire</th>
            <th className="border p-3 text-center">Total</th>
            <th className="border p-3 text-center">Utilisés</th>
            <th className="border p-3 text-center">Disponibles</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-3 font-medium">{typeTranslations[TerritoryType.BUILDING]}</td>
            <td className="border p-3 text-center">{statistics.totalTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
            <td className="border p-3 text-center">{statistics.usedTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
            <td className="border p-3 text-center">{statistics.availableTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
          </tr>
          <tr>
            <td className="border p-3 font-medium">{typeTranslations[TerritoryType.HOUSE]}</td>
            <td className="border p-3 text-center">{statistics.totalTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
            <td className="border p-3 text-center">{statistics.usedTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
            <td className="border p-3 text-center">{statistics.availableTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
          </tr>
          <tr className="bg-gray-50 font-semibold">
            <td className="border p-3">Total</td>
            <td className="border p-3 text-center">{statistics.totalTerritories}</td>
            <td className="border p-3 text-center">{statistics.usedTerritories}</td>
            <td className="border p-3 text-center">{statistics.availableTerritories}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}