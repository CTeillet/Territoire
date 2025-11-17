export interface TerritoryReminder {
    id: string;
    // Ancien format (rappel lié à un seul territoire)
    territoryId?: string;
    territoryName?: string;

    // Nouveau format (rappel pouvant concerner plusieurs territoires)
    territoryIds?: string[];
    territoryNames?: string[];
    personId: string;
    personName: string;
    reminderDate: string;
    notes?: string;
    messageSend?: string;
}