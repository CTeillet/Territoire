import {TerritoryStatus} from "@/models/territory-status";
import {AddressNotToDo} from "@/models/addressNotToDo";
import {Feature, FeatureCollection, MultiPolygon, Polygon} from "geojson";
import {Assignment} from "@/models/assignment";
import {City} from "@/models/city";
import {TerritoryType} from "@/models/territory-type";

export interface PolygonProperties {
    type: PolygonType | MultiPolygon;
    id?: string | null;
}

export interface Territory {
    id: string;
    name: string;
    status: TerritoryStatus;
    type?: TerritoryType;
    lastModifiedDate: string | null;
    city: City;
    addressesNotToDo: AddressNotToDo[];
    assignments: Assignment[];
    geojson: string;
    note?: string | null;
    lastVisitedOn: string;
    assignedOn: string;
    waitedFor: string;
    assignedTo: string;
    territoryMapId?: string;
}

export interface SimplifiedTerritory {
    territoryId: string;
    name: string;
    status: TerritoryStatus;
    type?: TerritoryType;
    cityId: string;
    cityName: string;
    territoryMapId?: string;
}

type PolygonType = "BLOCK" | "CONCAVE_HULL";

export type TerritoryFeature = Feature<Polygon, Territory>;

export type TerritoryCollection = FeatureCollection<Polygon, Territory>;
