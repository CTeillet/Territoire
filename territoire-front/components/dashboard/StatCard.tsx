import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export const StatCard: React.FC<StatCardProps> =  ({ title, count }: { title: string; count: number }) => (
    <Card>
        <CardContent className={"mt-3"}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-2xl font-bold">{count}</p>
        </CardContent>
    </Card>
);
