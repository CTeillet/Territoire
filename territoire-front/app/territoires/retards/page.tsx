"use client";

import {useEffect, useMemo} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {Territory} from "@/models/territory";
import {TerritoryStatus} from "@/models/territory-status";
import {format} from "date-fns";
import {fr} from "date-fns/locale";
import {useAuth} from "@/hooks/use-auth";
import {useAppDispatch, useAppSelector} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {createReminder, fetchReminders} from "@/store/slices/reminder-slice";
import {PageHeader} from "@/components/late-territory/page-header";
import {LoadingState} from "@/components/late-territory/loading-state";
import {EmptyState} from "@/components/late-territory/empty-state";
import {LateTerritoriesTable, createLateTerritoriesColumns} from "@/components/late-territory/late-territories-table";

export default function LateTerritoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const territoriesData = useAppSelector(state => state.territories.territoriesGeojson);
  const territoriesLoading = useAppSelector(state => state.territories.loading);
  const reminders = useAppSelector(state => state.reminders.reminders);
  const remindersLoading = useAppSelector(state => state.reminders.loading);

  // Filter late territories from the store using useMemo
  const territories = useMemo(() => {
    console.log("[DEBUG_LOG] territoriesData:", territoriesData);

    if (!territoriesData?.features) {
      console.log("[DEBUG_LOG] No features in territoriesData");
      return [];
    }

    // Log all statuses to see what's available
    const statuses = territoriesData.features.map(f => f.properties.status);
    console.log("[DEBUG_LOG] All territory statuses:", statuses);

    // Count territories by status
    const statusCounts = statuses.reduce<Record<TerritoryStatus, number>>((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<TerritoryStatus, number>);
    console.log("[DEBUG_LOG] Territory counts by status:", statusCounts);

    // Check if there are any territories with status containing "late" (case insensitive)
    const hasLateStatusCaseInsensitive = statuses.some(
      status => status && status.toLowerCase().includes("late")
    );
    console.log("[DEBUG_LOG] Has status containing 'late' (case insensitive):", hasLateStatusCaseInsensitive);

    // More flexible filtering to handle potential issues
    const filteredTerritories = territoriesData.features
      .filter(feature => {
        // Get the status, handling potential undefined/null values
        const status = feature.properties?.status || "";

        // Check if status is "LATE" (exact match) or contains "late" (case insensitive)
        const isExactMatch = status === "LATE";
        const isCaseInsensitiveMatch = status.toLowerCase().includes("late");

        // For debugging
        if (isExactMatch || isCaseInsensitiveMatch) {
          console.log(`[DEBUG_LOG] Found late territory: ${feature.properties.name}, status: ${status}`);
        }

        // Use exact match for production, but log if there would be matches with case-insensitive comparison
        const isLate = isExactMatch;
        console.log(`[DEBUG_LOG] Territory ${feature.properties.name} status: ${status}, isLate: ${isLate}`);
        return isLate;
      })
      .map(feature => ({
        id: feature.properties.id,
        name: feature.properties.name,
        status: feature.properties.status,
        city: feature.properties.city,
        assignedTo: feature.properties.assignedTo,
        assignedOn: feature.properties.assignedOn,
        waitedFor: feature.properties.waitedFor,
      })) as Territory[];

    console.log("[DEBUG_LOG] Filtered territories count:", filteredTerritories.length);

    // If no territories are found with status "LATE", check if there are any with status "ASSIGNED"
    // that might be late but not properly marked
    if (filteredTerritories.length === 0) {
      console.log("[DEBUG_LOG] No territories with status LATE found. Checking for potentially late territories...");

      // For debugging purposes only - don't actually use this in production without confirmation
      const potentiallyLateTerritories = territoriesData.features
        .filter(feature => {
          const status = feature.properties?.status || "";
          return status === "ASSIGNED";
        })
        .map(feature => ({
          id: feature.properties.id,
          name: feature.properties.name,
          status: feature.properties.status,
          city: feature.properties.city,
          assignedTo: feature.properties.assignedTo,
          assignedOn: feature.properties.assignedOn,
          waitedFor: feature.properties.waitedFor,
        })) as Territory[];

      console.log("[DEBUG_LOG] Potentially late territories (status=ASSIGNED):", potentiallyLateTerritories.length);
      console.log("[DEBUG_LOG] Sample potentially late territories:", potentiallyLateTerritories.slice(0, 3));
    }

    return filteredTerritories;
  }, [territoriesData]);

  // Fetch territories and reminders from Redux store when component mounts
  useEffect(() => {
    try {
      // Fetch territories and reminders using Redux
      dispatch(fetchTerritories());
      dispatch(fetchReminders());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Impossible de récupérer les données");
    }
  }, [dispatch]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  // Check if a territory has a reminder for the assigned person
  const hasReminder = (territoryId: string, personId: string) => {
    return reminders.some(
      (reminder) =>
        reminder.territoryId === territoryId && reminder.personId === personId
    );
  };

  // Send a reminder
  const sendReminder = async (territoryId: string, personId: string) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté pour envoyer un rappel");
      return;
    }

    try {
      // Use Redux action to create reminder
      const resultAction = await dispatch(
        createReminder({
          territoryId,
          personId,
          remindedById: user.id,
        })
      );

      if (createReminder.rejected.match(resultAction)) {
        throw new Error(resultAction.payload as string || "Failed to send reminder");
      }

      toast.success("Rappel envoyé avec succès");
    } catch (error: unknown) {
      console.error("Error sending reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer le rappel";
      toast.error(errorMessage);
    }
  };

  // Create columns using the helper function
  const columns = createLateTerritoriesColumns(formatDate, hasReminder, sendReminder);

  // Log render conditions
  console.log("[DEBUG_LOG] Render conditions:", {
    territoriesLoading,
    remindersLoading,
    territoriesDataExists: !!territoriesData,
    territoriesLength: territories.length,
    showLoading: territoriesLoading || remindersLoading || !territoriesData,
    showEmptyState: !territoriesLoading && !remindersLoading && !!territoriesData && territories.length === 0,
    showTable: !territoriesLoading && !remindersLoading && !!territoriesData && territories.length > 0
  });

  return (
    <div className="container mx-auto py-8 px-6">
      <PageHeader 
        title="Territoires en retard" 
        description="Gérez les territoires en retard et envoyez des rappels" 
      />

      {territoriesLoading || remindersLoading || !territoriesData ? (
        <LoadingState />
      ) : territories.length === 0 ? (
        <EmptyState />
      ) : (
        <LateTerritoriesTable 
          territories={territories} 
          columns={columns} 
        />
      )}
    </div>
  );
}
