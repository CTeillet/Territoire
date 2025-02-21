import StatCard from "@/components/dashboard/stat-card";
import React, {useEffect} from "react";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";

export const StatisticsOverview: React.FC = () => {
    const dispatch = useAppDispatch();
    const territories = useSelector((state: RootState) => state.territories.territoriesGeojson);

    useEffect(() => {
        if (!territories) {
            dispatch(fetchTerritories())
        }
    }, [dispatch, territories]);
    return (
        <div className="grid grid-cols-2 gap-4">
            <StatCard title="Territoires disponibles" count={territories?.features.filter(f => f.properties.status === "AVAILABLE").length || 0} />
            <StatCard title="Territoires en retard" count={territories?.features.filter(f => f.properties.status === "LATE").length || 0} />
            <StatCard title="Territoires en attente" count={territories?.features.filter(f => f.properties.status === "PENDING").length || 0} />
            <StatCard title="Territoires en circulation" count={territories?.features.filter(f => f.properties.status === "ASSIGNED").length || 0} />
        </div>
    );
};
