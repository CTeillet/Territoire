import {TerritoryStatus} from "@/models/territory-status";
import {AddressNotToDo} from "@/models/addressNotToDo";
import {Feature, FeatureCollection, Polygon} from "geojson";
import {Assignment} from "@/models/assignment";
import {City} from "@/models/city";

export interface PolygonProperties {
    type: PolygonType;
    id?: string | null;
}

export interface Territory {
    id: string;
    name: string;
    status: TerritoryStatus;
    lastModifiedDate: string | null;
    city: City;
    addressesNotToDo: AddressNotToDo[];
    assignments: Assignment[];
    geojson: string;
    note?: string | null;
    lastVisitedOn: string;
}

export interface SimplifiedTerritory {
    territoryId: string;
    name: string;
    status: TerritoryStatus;
}

type PolygonType = "BLOCK" | "CONCAVE_HULL";

export type TerritoryFeature = Feature<Polygon, Territory>;

export type TerritoryCollection = FeatureCollection<Polygon, Territory>;
