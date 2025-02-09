"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {TerritoryStatus} from "@/models/territory-status";
import {Territory} from "@/models/territory";

const getBadgeColor = (status: TerritoryStatus): string => {
    switch (status) {
        case "AVAILABLE":
            return "bg-green-500";
        case "ASSIGNED":
            return "bg-blue-500";
        case "PENDING":
            return "bg-yellow-500";
        case "LATE":
            return "bg-red-500";
        default:
            return "bg-gray-500";
    }
};

const TerritoryDetail = () => {
    const { id } = useParams();
    const [territoire, setTerritoire] = useState<Territory | null>(null);

    useEffect(() => {
        // Simulation d'une requête API pour récupérer les données
        fetch(`/api/territoires/${id}`)
            .then((res) => res.json())
            .then((data) => setTerritoire(data));
    }, [id]);

    if (!territoire) return <p>Chargement...</p>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Détail du Territoire : {territoire.name}</h1>

            <Card>
                <CardContent>
                    <p className="text-lg">
                        <strong>Statut :</strong>{" "}
                        <Badge className={`${getBadgeColor(territoire.status)} text-white px-2 py-1 rounded`}>
                            {territoire.status}
                        </Badge>
                    </p>
                    <p className="text-lg"><strong>Dernière modification :</strong> {territoire.lastModifiedDate?.toDateString()}</p>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button>Modifier</Button>
                <Button className="bg-red-500">Libérer</Button>
            </div>
        </div>
    );
};

export default TerritoryDetail;
