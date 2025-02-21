"use client";

import React from "react";
import {AssignmentsTable} from "@/components/dashboard/assignments-table";
import {StatisticsChart} from "@/components/dashboard/statistics-chart";
import {StatisticsOverview} from "@/components/dashboard/statistics-overview";

const Dashboard = () => {

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
