"use client";

import React, {useEffect} from "react";
import {AssignmentsTable} from "@/components/dashboard/assignments-table";
import {StatisticsChart} from "@/components/dashboard/statistics-chart";
import {StatisticsOverview} from "@/components/dashboard/statistics-overview";
import {useAuth} from "@/hooks/use-auth";
import {useRouter} from "next/navigation";

const Dashboard = () => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login'); // Redirige si non connecté
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) return null; // Evite un affichage momentané non protégé


    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard des Territoires</h1>
            <StatisticsOverview/>
            <AssignmentsTable/>
            <StatisticsChart/>
        </div>
    )
        ;
};

export default Dashboard;
