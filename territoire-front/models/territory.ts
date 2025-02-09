import {TerritoryStatus} from "@/models/territory-status";

export interface Territory {
    id: string;
    name: string;
    status: TerritoryStatus;
    lastModifiedDate: Date | null;
}

