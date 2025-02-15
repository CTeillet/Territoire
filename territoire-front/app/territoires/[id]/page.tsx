"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation"; // Pour Next.js 13+ (App Router)
import {Territory} from "@/models/territory";
import AssignmentsList from "@/components/territory/id/assignments-list";
import AddressNotToDoList from "@/components/territory/id/address-not-to-do-list";
import TerritoryHeader from "@/components/territory/id/territory-header";
import dynamic from "next/dynamic";

const TerritoryIdMap = dynamic(() => import("@/components/territory/id/territory-id-map"));

const mockTerritory: Territory = {
    "id": "1161b57b-ffe0-43e0-afc5-1ff42bb381c3",
    "name": "JP1",
    "status": "ASSIGNED",
    "lastModifiedDate": new Date("2025-02-15T21:17:01.565842Z"),
    "city": "Juvisy sur Orge",
    "addressNotToDo": [
        {
            "id": "b4f8e5e7-9f6d-4b3d-9c5f-0d3e1c7e9b4f",
            "street": "Example Street",
            "number": "123",
            "zipCode": "10000",
            "city": "Unknown City"
        }
    ],
    "assignments": [
        {
            "id": "d4a0ca26-52e7-4905-b6fd-e7b1d17b6695",
            "person": {
                "id": "be7aa153-6e9c-435c-81a0-b3011957ca24",
                "firstName": "Alice",
                "lastName": "Johnson"
            },
            "assignmentDate": new Date("2024-01-01"),
            "dueDate": new Date("2024-01-05"),
            "returnDate": null
        },
        {
            "id": "d4a0ca26-52e7-4905-b6fd-tydtydtyudyutyu",
            "person": {
                "id": "be7aa153-6e9c-435c-81a0-b3011957ca24",
                "firstName": "Alice",
                "lastName": "Johnson"
            },
            "assignmentDate": new Date("2024-01-01"),
            "dueDate": new Date("2024-01-05"),
            "returnDate": new Date("2024-01-05")
        }
    ],
    "geojson": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3603239,
                                48.6933831
                            ],
                            [
                                2.3608281,
                                48.6931494
                            ],
                            [
                                2.3610212,
                                48.6933193
                            ],
                            [
                                2.3655059,
                                48.693723
                            ],
                            [
                                2.3659458,
                                48.6942258
                            ],
                            [
                                2.3614397,
                                48.6945303
                            ],
                            [
                                2.3603239,
                                48.6933831
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3654329,
                                48.6936768
                            ],
                            [
                                2.3635982,
                                48.6934926
                            ],
                            [
                                2.3647891,
                                48.6929898
                            ],
                            [
                                2.3654329,
                                48.6936768
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3647891,
                                48.6929898
                            ],
                            [
                                2.3634909,
                                48.6934856
                            ],
                            [
                                2.3620533,
                                48.6933439
                            ],
                            [
                                2.3642205,
                                48.6924516
                            ],
                            [
                                2.3647891,
                                48.6929898
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3609053,
                                48.6931315
                            ],
                            [
                                2.3635017,
                                48.6919629
                            ],
                            [
                                2.3641239,
                                48.6924303
                            ],
                            [
                                2.3619031,
                                48.6933297
                            ],
                            [
                                2.3611091,
                                48.6932802
                            ],
                            [
                                2.3609053,
                                48.6931315
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3615088,
                                48.6945797
                            ],
                            [
                                2.3625602,
                                48.6945088
                            ],
                            [
                                2.3638906,
                                48.6959323
                            ],
                            [
                                2.3632683,
                                48.696428
                            ],
                            [
                                2.3620237,
                                48.6950966
                            ],
                            [
                                2.3615088,
                                48.6945797
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3645987,
                                48.6954295
                            ],
                            [
                                2.3639657,
                                48.6958756
                            ],
                            [
                                2.3626675,
                                48.6944805
                            ],
                            [
                                2.3636545,
                                48.6944168
                            ],
                            [
                                2.3645987,
                                48.6954295
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "BLOCK"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.363794,
                                48.6944451
                            ],
                            [
                                2.3658539,
                                48.694261
                            ],
                            [
                                2.3659505,
                                48.6943176
                            ],
                            [
                                2.364663,
                                48.6953445
                            ],
                            [
                                2.363794,
                                48.6944451
                            ]
                        ]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "type": "CONCAVE_HULL"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                2.3603239,
                                48.6933831
                            ],
                            [
                                2.3635017,
                                48.6919629
                            ],
                            [
                                2.3642205,
                                48.6924516
                            ],
                            [
                                2.3660179,
                                48.6942752
                            ],
                            [
                                2.3632683,
                                48.696428
                            ],
                            [
                                2.3603239,
                                48.6933831
                            ]
                        ]
                    ]
                }
            }
        ]
    }
}

const TerritoryPage = () => {
    const {id} = useParams();
    const [territory, setTerritory] = useState<Territory>();

    useEffect(() => {
        const fetchMockData = () => {
            setTimeout(() => {
                setTerritory(mockTerritory);
            }, 2000); // Simule un délai de 2 secondes
        };

        fetchMockData();
    }, [id]);

    if (!territory) return <p>Loading...</p>;

    return (
        <div className="p-6">

            <TerritoryHeader
                name={territory.name}
                city={territory.city}
                status={territory.status}
                lastModifiedDate={territory.lastModifiedDate}
            />

            {/* Map */}
            <TerritoryIdMap territory={territory}/>

            {/* Section Adresses à ne pas visiter */}
            {territory.addressNotToDo && territory.addressNotToDo.length > 0 && (
                <AddressNotToDoList addresses={territory.addressNotToDo}/>
            )}

            {/* Recent Activities */}
            <AssignmentsList assignments={territory.assignments || []}/>
        </div>
    );
};

export default TerritoryPage;
