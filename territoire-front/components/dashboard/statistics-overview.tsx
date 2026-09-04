import StatCard from "@/components/dashboard/stat-card";
import React, {useEffect, useMemo, useState} from "react";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {authFetch} from "@/utils/auth-fetch";

interface StatisticsOverviewProps {
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
    isCurrentPeriod?: boolean;
}

export const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({
    startDate,
    endDate,
    periodLabel,
    isCurrentPeriod = true
}) => {
    const dispatch = useAppDispatch();
    const territories = useSelector((state: RootState) => state.territories.territoriesGeojson);
    const [territoriesNotAssigned, setTerritoriesNotAssigned] = useState<number>(0);
    const [totalTerritories, setTotalTerritories] = useState<number>(0);
    const [publishersCount, setPublishersCount] = useState<number>(0);

    useEffect(() => {
        if (!territories) {
            dispatch(fetchTerritories());
        } else {
            setTotalTerritories(territories.features.length);
        }
    }, [dispatch, territories]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                let url = "/api/territoires/statistiques/non-assignes-depuis";
                const searchParams = new URLSearchParams();
                if (startDate) searchParams.append("startDate", startDate);
                if (endDate) searchParams.append("endDate", endDate);
                const queryString = searchParams.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }

                const response = await authFetch(url);
                const count = await response.json();
                setTerritoriesNotAssigned(count);
            } catch (error) {
                console.error("Erreur lors de la récupération des territoires non assignés :", error);
            }
        };

        fetchStats();
    }, [startDate, endDate]);

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

    const territoriesVisited = Math.max(0, totalTerritories - territoriesNotAssigned);
    const percentageVisited = totalTerritories > 0
        ? ((territoriesVisited / totalTerritories) * 100).toFixed(1) + "%"
        : "0%";

    if (!isCurrentPeriod) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title={`Territoires parcourus (${periodLabel || "période"})`} count={territoriesVisited} />
                <StatCard title={`Territoires non parcourus (${periodLabel || "période"})`} count={territoriesNotAssigned} />
                <StatCard title="Taux de couverture" count={percentageVisited} />
                <StatCard title="Total des territoires" count={totalTerritories} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Territoires disponibles" count={territories?.features.filter(f => f.properties.status === "AVAILABLE").length || 0} />
            <StatCard title="Territoires en retard" count={territories?.features.filter(f => f.properties.status === "LATE").length || 0} />
            <StatCard title="Moyenne par proclamateur" count={avgPerPublisher} />
            <StatCard title="Territoires en circulation" count={territoriesInCirculation} />
            <StatCard title={periodLabel ? `Non parcourus (${periodLabel})` : "Non parcourus depuis le 01/09"} count={territoriesNotAssigned} />
            <StatCard title="Total des territoires" count={totalTerritories} />
        </div>
    );
};
