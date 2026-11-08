import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tone, toneText } from "@/components/shared/tones";

interface StatCardProps {
  title: string;
  value: number | string;
  /** Ton du chiffre, ex. « success » pour un résultat positif (couleur du thème sinon). */
  tone?: Tone;
}

/** Chiffre clé (tableau de bord, statistiques d'une campagne) : la même carte partout. */
export function StatCard({ title, value, tone }: StatCardProps) {
  return (
    <Card className="gap-1 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone && toneText[tone]
        )}
      >
        {value}
      </p>
    </Card>
  );
}
