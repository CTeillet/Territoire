import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  /** Teinte du chiffre, ex. text-green-700 pour un résultat positif. */
  valueClassName?: string;
}

/** Chiffre clé (tableau de bord, statistiques d'une campagne) : la même carte partout. */
export function StatCard({ title, value, valueClassName }: StatCardProps) {
  return (
    <Card className="gap-1 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className={cn("text-2xl font-bold tabular-nums", valueClassName)}>
        {value}
      </p>
    </Card>
  );
}
