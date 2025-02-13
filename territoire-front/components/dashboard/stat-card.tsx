import React from "react";
import { Card } from "@/components/ui/card";
import {StatCardProps} from "@/models/stat-card-props";

const StatCard: React.FC<StatCardProps> =  ({ title, count }: { title: string; count: number }) => (
    <Card className="p-4 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-2xl font-bold">{count}</p>
    </Card>
);

export default StatCard;
