"use client";

import {useEffect, useMemo} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {useAuth} from "@/hooks/use-auth";
import {useAppDispatch, useAppSelector} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {PageHeader} from "@/components/late-territory/page-header";
import {LoadingState} from "@/components/late-territory/loading-state";
import {EmptyState} from "@/components/late-territory/empty-state";
import {DataTable} from "@/components/territory/territory-data-table";
import {nonVisitedTerritoryColumns} from "@/components/non-visited-territory/non-visited-territory-columns";

export default function NonVisitedTerritoriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const territoriesData = useAppSelector(state => state.territories.territoriesGeojson);
  const loading = useAppSelector(state => state.territories.loading);

  // Fetch territories from Redux store when component mounts
  useEffect(() => {
    try {
      // Fetch territories using Redux
      dispatch(fetchTerritories());
    } catch (error) {
      console.error("Error fetching territories:", error);
      toast.error("Impossible de récupérer les territoires");
    }
  }, [dispatch]);

  // Filter non-visited territories from the Redux store
  const nonVisitedTerritories = useMemo(() => {
    if (!territoriesData?.features) {
      return [];
    }

    // Get current date to calculate reference date (September 1st of previous year)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // If we're before September, use September 1st of the year before last year
    // Otherwise, use September 1st of last year
    const referenceYear = currentMonth < 9 ? currentYear - 1 : currentYear;
    const referenceDate = new Date(`${referenceYear}-09-01`);

    console.log("[DEBUG_LOG] Reference date for non-visited territories:", referenceDate.toISOString().split('T')[0]);

    return territoriesData.features
        .map(f => f.properties)
        .filter(t => {
          const lastVisitedOn = t.lastVisitedOn;

          // If lastVisitedOn is null, undefined, or not a valid date string, consider it not visited
          // But only if the territory is not currently assigned or late
          if ((!lastVisitedOn || lastVisitedOn === 'N/A' || lastVisitedOn === 'nouveau') && 
              t.status !== "ASSIGNED" && t.status !== "LATE") {
            return true;
          }

          // Parse the lastVisitedOn date and compare with reference date
          try {
            const lastVisitDate = new Date(lastVisitedOn);
            console.log(`[DEBUG_LOG] Last visited on date: ${lastVisitDate.toISOString().split('T')[0]}, status: ${t.status}, reference date: ${referenceDate.toISOString().split('T')[0]}, ${lastVisitDate < referenceDate ? 'before' : 'after'} reference date`);
            // Only include territories that are AVAILABLE or PENDING and were last visited before the reference date
            // Explicitly exclude ASSIGNED and LATE territories
            return (t.status === "AVAILABLE" || t.status === "PENDING") &&
                   lastVisitDate < referenceDate;
          } catch (e) {
            console.error(`[DEBUG_LOG] Error parsing date: ${lastVisitedOn}`, e);
            // Only include if it's not assigned or late, even when we can't parse the date
            return t.status !== "ASSIGNED" && t.status !== "LATE"; // Only include non-assigned and non-late territories when date parsing fails
          }
        });
    // Filter territories that haven't been visited since the reference date
  }, [territoriesData]);

  useEffect(() => {
    console.log("[DEBUG_LOG] Non-visited territories:", nonVisitedTerritories);
    console.log("[DEBUG_LOG] Non-visited territories length:", nonVisitedTerritories.length);
    
    // Log any territories with status ASSIGNED or LATE that might have slipped through
    const assignedTerritories = nonVisitedTerritories.filter(t => t.status === "ASSIGNED");
    const lateTerritories = nonVisitedTerritories.filter(t => t.status === "LATE");
    
    if (assignedTerritories.length > 0) {
      console.log("[DEBUG_LOG] WARNING: Found ASSIGNED territories in the non-visited list:", assignedTerritories);
    } else {
      console.log("[DEBUG_LOG] No ASSIGNED territories found in the non-visited list - filtering working correctly");
    }
    
    if (lateTerritories.length > 0) {
      console.log("[DEBUG_LOG] WARNING: Found LATE territories in the non-visited list:", lateTerritories);
    } else {
      console.log("[DEBUG_LOG] No LATE territories found in the non-visited list - filtering working correctly");
    }
  }, [nonVisitedTerritories]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Use the dedicated columns for non-visited territories
  const columns = nonVisitedTerritoryColumns;

  // Get current date to determine reference date for description
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const referenceYear = currentMonth < 9 ? currentYear - 1 : currentYear;

  return (
    <div className="container mx-auto py-8 px-6">
      <PageHeader 
        title="Territoires non parcourus" 
        description={`Liste des territoires non parcourus depuis le 1er septembre ${referenceYear}`} 
      />

      {loading ? (
        <LoadingState />
      ) : !territoriesData ? (
        <EmptyState />
      ) : nonVisitedTerritories.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <DataTable
            data={nonVisitedTerritories}
            columns={columns}
            tableId="non-visited-territories" 
          />
        </div>
      )}
    </div>
  );
}