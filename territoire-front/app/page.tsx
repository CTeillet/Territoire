"use client";

import React, {useEffect, useState} from "react";
import {StatCard} from "@/components/dashboard/StatCard";
import {TerritoryRow} from "@/components/dashboard/TerritoryRow";
import {Table, TableBody, TableCaption, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {Territory} from "@/models/territory";

const Dashboard = () => {
    const [territoires, setTerritoires] = useState<Territory[]>([]);

    useEffect(() => {
        setTerritoires([
            {id: "1", status: "AVAILABLE", lastModifiedDate: null, name: "01"},
            {id: "2", status: "ASSIGNED", lastModifiedDate: new Date("2023-10-01"), name: "02"},
            {id: "3", status: "PENDING", lastModifiedDate: new Date("2023-06-15"), name: "03"},
        ]);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard des Territoires</h1>
            <div className="grid grid-cols-2 gap-4">
                <StatCard title="Territoires Disponibles"
                          count={territoires.filter(t => t.status === "AVAILABLE").length}/>
                <StatCard title="Territoires en Retard"
                          count={territoires.filter(t => t.status === "LATE").length}/>
                <StatCard title="Territoires en Attente"
                          count={territoires.filter(t => t.status === "PENDING").length}/>
                <StatCard title="Territoires Distribués"
                          count={territoires.filter(t => t.status === "ASSIGNED").length}/>
            </div>
            <Table className={"bg-gray-300 rounded-sm"}>
                <TableCaption>Actualités des territoires</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Date Attribution</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {territoires.map((territory) => (
                        <TerritoryRow key={territory.id} {...territory} />
                    ))}
                </TableBody>
            </Table>

        </div>
    )
        ;
};

export default Dashboard;
