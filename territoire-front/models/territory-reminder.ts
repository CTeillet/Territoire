export interface TerritoryReminder {
    id: string;
    territoryId: string;
    territoryName: string;
    personId: string;
    personName: string;
    remindedById: string;
    remindedByName: string;
    reminderDate: string;
    notes?: string;
}