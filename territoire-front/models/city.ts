export interface City {
    id: string;
    name: string;
    zipCode: string;
    center: {
        latitude: number;
        longitude: number;
    };
}
