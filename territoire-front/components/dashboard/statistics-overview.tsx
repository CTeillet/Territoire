import StatCard from "@/components/dashboard/stat-card";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {authFetch} from "@/utils/auth-fetch";

export const StatisticsOverview: React.FC = () => {
    const dispatch = useAppDispatch();
    const territories = useSelector((state: RootState) => state.territories.territoriesGeojson);
    const [territoriesNotAssigned, setTerritoriesNotAssigned] = useState<number>(0);
    const [totalTerritories, setTotalTerritories] = useState<number>(0);

    useEffect(() => {
        if (!territories) {
            dispatch(fetchTerritories())
        }
    }, [dispatch, territories]);

    useEffect(() => {
        const fetchTerritoriesNotAssigned = async () => {
            try {
                const response = await authFetch("/api/territoires/statistiques/non-assignes-depuis");
                const count = await response.json();
                setTerritoriesNotAssigned(count);

                // Set total territories count from the territories data
                if (territories) {
                    setTotalTerritories(territories.features.length);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des territoires non assignés :", error);
            }
        };

        fetchTerritoriesNotAssigned();
    }, [territories]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <StatCard title="Territoires disponibles" count={territories?.features.filter(f => f.properties.status === "AVAILABLE").length || 0} />
            <StatCard title="Territoires en retard" count={territories?.features.filter(f => f.properties.status === "LATE").length || 0} />
            <StatCard title="Territoires en attente" count={territories?.features.filter(f => f.properties.status === "PENDING").length || 0} />
            <StatCard title="Territoires en circulation" count={territories?.features.filter(f => f.properties.status === "ASSIGNED" || f.properties.status === "LATE").length || 0} />
            <StatCard title="Territoires non parcourus depuis le 01/09" count={territoriesNotAssigned} />
            <StatCard title="Total des territoires" count={totalTerritories} />
        </div>
    );
};
