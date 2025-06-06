import { TerritoryType } from "./territory-type";

export interface UpdateTerritoryDto {
    name: string;
    note?: string | null;
    cityId?: string;
    type?: TerritoryType;
}
