import {TerritoryStatus} from "@/models/territory-status";
import {AddressNotToDo} from "@/models/addressNotToDo";
import {Feature, FeatureCollection, MultiPolygon, Polygon} from "geojson";
import {Assignment} from "@/models/assignment";
import {City} from "@/models/city";

export interface PolygonProperties {
    type: PolygonType | MultiPolygon;
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
    assignedOn: string;
    waitedFor: string;
    assignedTo: string;
}

export interface SimplifiedTerritory {
    territoryId: string;
    name: string;
    status: TerritoryStatus;
    cityId: string;
    cityName: string;
}

type PolygonType = "BLOCK" | "CONCAVE_HULL";

export type TerritoryFeature = Feature<Polygon, Territory>;

export type TerritoryCollection = FeatureCollection<Polygon, Territory>;
