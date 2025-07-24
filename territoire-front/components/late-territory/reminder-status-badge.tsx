import React from "react";
import { Badge } from "@/components/ui/badge";

interface ReminderStatusBadgeProps {
  hasReminder: boolean;
}

export function ReminderStatusBadge({ hasReminder }: ReminderStatusBadgeProps) {
  return (
    <div className="flex justify-center">
      {hasReminder ? (
        <Badge className="bg-green-500 text-white px-2 py-1 rounded">
          Rappel envoyé
        </Badge>
      ) : (
        <Badge className="bg-yellow-500 text-white px-2 py-1 rounded">
          Pas de rappel
        </Badge>
      )}
    </div>
  );
}