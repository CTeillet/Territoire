import {StatCard} from "@/components/dashboard/StatCard";
import React from "react";
import {Territory} from "@/models/territory";

export const StatisticsOverview: React.FC<{ territories: Territory[] }> = ({ territories }) => (
    <div className="grid grid-cols-2 gap-4">
        <StatCard title="Territoires disponibles" count={territories.filter(t => t.status === "AVAILABLE").length} />
        <StatCard title="Territoires en retard" count={territories.filter(t => t.status === "LATE").length} />
        <StatCard title="Territoires en attente" count={territories.filter(t => t.status === "PENDING").length} />
        <StatCard title="Territoires en circulation" count={territories.filter(t => t.status === "ASSIGNED").length} />
    </div>
);
