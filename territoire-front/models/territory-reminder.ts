export interface TerritoryReminder {
    id: string;
    territoryId: string;
    territoryName: string;
    personId: string;
    personName: string;
    reminderDate: string;
    notes?: string;
    messageSend?: string;
}