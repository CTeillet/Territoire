"use client";

import React, {useEffect, useState} from "react";
import {AssignmentsTable} from "@/components/dashboard/assignments-table";
import {StatisticsChart} from "@/components/dashboard/statistics-chart";
import {StatisticsOverview} from "@/components/dashboard/statistics-overview";
import {Assignment} from "@/models/assignment";

const MOCK_ASSIGNMENTS: Assignment[] = [
    {
        id: "1",
        territory: {id: "1", status: "ASSIGNED", lastModifiedDate: null, name: "01", city: "", geojson: {type: "FeatureCollection", features: []}},
        assignmentDate: new Date("2023-06-15"),
        dueDate: new Date("2023-06-15"),
        returnDate: null,
        person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
    },
    {
        id: "2",
        territory: {id: "2", status: "PENDING", lastModifiedDate: null, name: "02", city: "", geojson: {type: "FeatureCollection", features: []}},
        assignmentDate: new Date("2023-06-15"),
        dueDate: new Date("2023-06-15"),
        returnDate: new Date("2023-09-15"),
        person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
    },
    {
        id: "3",
        territory: {id: "3", status: "ASSIGNED", lastModifiedDate: null, name: "03", city: "", geojson: {type: "FeatureCollection", features: []}},
        assignmentDate: new Date("2023-06-15"),
        dueDate: new Date("2023-06-15"),
        returnDate: new Date("2023-09-15"),
        person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
    }
];
const Dashboard = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        setAssignments(MOCK_ASSIGNMENTS)
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard des Territoires</h1>
            <StatisticsOverview/>
            <AssignmentsTable assignments={assignments} />
            <StatisticsChart/>
        </div>
    )
        ;
};

export default Dashboard;
