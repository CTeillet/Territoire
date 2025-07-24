import React from "react";
import { Button } from "@/components/ui/button";

interface ReminderActionButtonProps {
  hasReminder: boolean;
  onClick: () => void;
}

export function ReminderActionButton({ hasReminder, onClick }: ReminderActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={hasReminder}
      className="px-4 py-2 font-medium"
    >
      {hasReminder ? "Déjà rappelé" : "Envoyer un rappel"}
    </Button>
  );
}