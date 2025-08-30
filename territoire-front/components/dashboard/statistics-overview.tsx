import StatCard from "@/components/dashboard/stat-card";
import React, {useEffect, useMemo, useState} from "react";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {authFetch} from "@/utils/auth-fetch";

export const StatisticsOverview: React.FC = () => {
    const dispatch = useAppDispatch();
    const territories = useSelector((state: RootState) => state.territories.territoriesGeojson);
    const [territoriesNotAssigned, setTerritoriesNotAssigned] = useState<number>(0);
    const [totalTerritories, setTotalTerritories] = useState<number>(0);
    const [publishersCount, setPublishersCount] = useState<number>(0);

    useEffect(() => {
        if (!territories) {
            dispatch(fetchTerritories())
        }
    }, [dispatch, territories]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await authFetch("/api/territoires/statistiques/non-assignes-depuis");
                const count = await response.json();
                setTerritoriesNotAssigned(count);

                if (territories) {
                    setTotalTerritories(territories.features.length);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des territoires non assignés :", error);
            }
        };

        fetchStats();
    }, [territories]);

    useEffect(() => {
        const fetchPublishers = async () => {
            try {
                const response = await authFetch("/api/settings/publishers-count");
                if (response.ok) {
                    const count = await response.json();
                    setPublishersCount(typeof count === 'number' ? count : 0);
                }
            } catch (e) {
                console.error("Erreur lors de la récupération du nombre de proclamateurs", e);
            }
        };
        fetchPublishers();
    }, []);

    const territoriesInCirculation = useMemo(() => (
        territories?.features.filter(f => f.properties.status === "ASSIGNED" || f.properties.status === "LATE").length || 0
    ), [territories]);

    const avgPerPublisher = useMemo(() => {
        if (!publishersCount || publishersCount <= 0) return 0;
        return Number((territoriesInCirculation / publishersCount).toFixed(2));
    }, [territoriesInCirculation, publishersCount]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <StatCard title="Territoires disponibles" count={territories?.features.filter(f => f.properties.status === "AVAILABLE").length || 0} />
            <StatCard title="Territoires en retard" count={territories?.features.filter(f => f.properties.status === "LATE").length || 0} />
            <StatCard title="Territoires moyens par proclamateur" count={avgPerPublisher} />
            <StatCard title="Territoires en circulation" count={territoriesInCirculation} />
            <StatCard title="Territoires non parcourus depuis le 01/09" count={territoriesNotAssigned} />
            <StatCard title="Total des territoires" count={totalTerritories} />
        </div>
    );
};
