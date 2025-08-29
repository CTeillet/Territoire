export interface City {
    id: string;
    name: string;
    zipCode: string;
    colorHex?: string;
    center: {
        latitude: number;
        longitude: number;
    };
}
