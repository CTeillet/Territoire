"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { authFetch } from "@/utils/auth-fetch";
import { ChevronDown } from "lucide-react";
import { ReminderDialog } from "@/components/late-territory/reminder-dialog";

interface ReminderActionButtonProps {
  hasReminder: boolean;
  territoryId: string;
  personId: string;
  onManualReminder: () => void; // will trigger existing Redux flow
  onSuccess?: () => void; // called after a successful WhatsApp send
  canSendWhatsApp?: boolean; // disable WhatsApp option if false
}

export function ReminderActionButton({ hasReminder, territoryId, personId, onManualReminder, onSuccess, canSendWhatsApp = true }: ReminderActionButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSendWhatsApp = async (message: string) => {
    try {
      const url = `/api/territory-reminders/whatsapp?territoryId=${territoryId}&personId=${personId}`;
      const res = await authFetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: message });
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || "Échec de l'envoi du message WhatsApp");
        return;
      }
      toast.success("Message WhatsApp envoyé et rappel enregistré");
      onSuccess?.();
    } catch (_) {
      toast.error("Erreur réseau lors de l'envoi");
    }
  };

  const handleManual = async () => {
    try {
      await onManualReminder();
      setOpen(false);
    } catch (_) {
      // onManualReminder gère déjà ses propres toasts
    }
  };

  return (
    <div className="inline-flex">
      <Button variant="outline" size="sm" disabled={hasReminder} className="px-3 py-2 font-medium inline-flex items-center gap-2" onClick={() => setOpen(true)}>
        {hasReminder ? "Déjà rappelé" : "Envoyer un rappel"}
      </Button>
      <ReminderDialog
        open={open}
        onOpenChange={setOpen}
        title="Rappel"
        description="Envoyez un message WhatsApp ou enregistrez le rappel."
        canSendWhatsApp={!!canSendWhatsApp}
        onManualReminders={handleManual}
        onSendWhatsApp={handleSendWhatsApp}
      />
    </div>
  );
}