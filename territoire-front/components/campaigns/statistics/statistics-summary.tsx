"use client";

import { CampaignStatistics } from "@/models/campaign-statistics";

interface StatisticsSummaryProps {
  statistics: CampaignStatistics;
}

export function StatisticsSummary({ statistics }: StatisticsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Total des territoires</h3>
        <p className="text-3xl font-bold">{statistics.totalTerritories}</p>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Territoires utilisés</h3>
        <p className="text-3xl font-bold text-green-600">{statistics.usedTerritories}</p>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Territoires disponibles</h3>
        <p className="text-3xl font-bold text-blue-600">{statistics.availableTerritories}</p>
      </div>
    </div>
  );
}