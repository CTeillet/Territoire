import React from "react";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
    title: string;
    count: number | string;
}

const StatCard: React.FC<StatCardProps> = ({ title, count }) => (
    <Card className="p-4 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-2xl font-bold">{count}</p>
    </Card>
);

export default StatCard;
