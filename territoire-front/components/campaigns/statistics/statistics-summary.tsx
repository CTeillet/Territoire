"use client";

import { CampaignStatistics } from "@/models/campaign-statistics";
import { GridContainer } from "@/components/shared/ui/grid-container";
import { StatCard } from "@/components/shared/ui/stat-card";

interface StatisticsSummaryProps {
  statistics: CampaignStatistics;
}

export function StatisticsSummary({ statistics }: StatisticsSummaryProps) {
  return (
    <GridContainer columns={1} mdColumns={3} gap={6} className="mb-8">
      <StatCard 
        title="Total des territoires" 
        value={statistics.totalTerritories} 
      />
      <StatCard 
        title="Territoires utilisés" 
        value={statistics.usedTerritories} 
        valueClassName="text-3xl font-bold text-green-600"
      />
      <StatCard 
        title="Territoires restants"
        value={statistics.availableTerritories} 
        valueClassName="text-3xl font-bold text-blue-600"
      />
    </GridContainer>
  );
}
