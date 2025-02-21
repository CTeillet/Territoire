export interface TerritoryStatusHistoryDto {
    date: string; // Format YYYY-MM-DD
    availableTerritory: number;
    assignedTerritory: number;
    pendingTerritory: number;
    lateTerritory: number;
}
