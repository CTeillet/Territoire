import React from "react";
import { Badge } from "@/components/ui/badge";

interface ReminderStatusBadgeProps {
  hasReminder: boolean;
}

export function ReminderStatusBadge({ hasReminder }: ReminderStatusBadgeProps) {
  return hasReminder ? (
    <Badge variant="success">Rappel envoyé</Badge>
  ) : (
    <Badge variant="warning">Pas de rappel</Badge>
  );
}
