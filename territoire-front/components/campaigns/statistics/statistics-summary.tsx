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
        tone="success"
      />
      <StatCard
        title="Territoires restants"
        value={statistics.availableTerritories}
        tone="info"
      />
    </GridContainer>
  );
}
