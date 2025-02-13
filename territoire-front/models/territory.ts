import {TerritoryStatus} from "@/models/territory-status";
import {Address} from "@/models/address";
import {Feature, FeatureCollection, Polygon} from "geojson";

export interface Territory {
    id: string;
    name: string;
    status: TerritoryStatus;
    lastModifiedDate: Date | null;
    city: string;
    addressNotToDo?: Address[] | null;
}

export type TerritoryFeature = Feature<Polygon, Territory>;

export type TerritoryCollection = FeatureCollection<Polygon, Territory>;
