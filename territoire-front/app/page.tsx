"use client";

import React, {useEffect, useState} from "react";
import {Territory} from "@/models/territory";
import {AssignmentsTable} from "@/components/dashboard/assignments-table";
import {StatisticsChart} from "@/components/dashboard/statistics-chart";
import {StatisticsOverview} from "@/components/dashboard/statistics-overview";
import {Assignment} from "@/models/assignment";
const Dashboard = () => {
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);


    useEffect(() => {
        setTerritories([
            {id: "1", status: "AVAILABLE", lastModifiedDate: null, name: "01", city: ""},
            {id: "2", status: "ASSIGNED", lastModifiedDate: new Date("2023-10-01"), name: "02", city: ""},
            {id: "3", status: "PENDING", lastModifiedDate: new Date("2023-06-15"), name: "03", city: ""},
            {id: "4", status: "LATE", lastModifiedDate: new Date("2023-06-15"), name: "04", city: ""},
        ]);
        setAssignments([
            {
                id: "1",
                territory: {id: "1", status: "ASSIGNED", lastModifiedDate: null, name: "01", city: ""},
                assignmentDate: new Date("2023-06-15"),
                dueDate: new Date("2023-06-15"),
                returnDate: null,
                person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
            },
            {
                id: "2",
                territory: {id: "2", status: "PENDING", lastModifiedDate: null, name: "02", city: ""},
                assignmentDate: new Date("2023-06-15"),
                dueDate: new Date("2023-06-15"),
                returnDate: new Date("2023-09-15"),
                person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
            },
            {
                id: "3",
                territory: {id: "3", status: "ASSIGNED", lastModifiedDate: null, name: "03", city: ""},
                assignmentDate: new Date("2023-06-15"),
                dueDate: new Date("2023-06-15"),
                returnDate: new Date("2023-09-15"),
                person: {id: "1", firstName: "John", lastName: "Doe", email: "", phoneNumber: ""}
            }
        ])
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard des Territoires</h1>
            <StatisticsOverview territories={territories} />
            <AssignmentsTable assignments={assignments} />
            <StatisticsChart/>

        </div>
    )
        ;
};

export default Dashboard;
