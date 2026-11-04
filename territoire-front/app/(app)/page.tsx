"use client";

import React, { useEffect } from "react";
import { AssignmentsTable } from "@/components/dashboard/assignments-table";
import { StatisticsChart } from "@/components/dashboard/statistics-chart";
import { StatisticsOverview } from "@/components/dashboard/statistics-overview";
import { AverageAssignmentDurationChart } from "@/components/dashboard/average-assignment-duration-chart";
import { TerritoryDistributionChart } from "@/components/dashboard/territory-distribution-chart";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/shared/page-layout";

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login"); // Redirige si non connecté
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null; // Evite un affichage momentané non protégé

  return (
    <PageContainer>
      <PageHeader title="Tableau de bord" />
      <StatisticsOverview />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AverageAssignmentDurationChart />
        <TerritoryDistributionChart />
      </div>
      <AssignmentsTable />
      <StatisticsChart />
    </PageContainer>
  );
};

export default Dashboard;
