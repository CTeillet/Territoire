"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";
import { renderTemplate } from "@/lib/template";

/** Lien personnel de la personne (variable {{ link }} du message), ou chaîne vide s'il n'est pas actif. */
async function fetchPersonLink(personId: string): Promise<string> {
  try {
    const res = await authFetch(
      `/api/personnes/${encodeURIComponent(personId)}/acces`
    );
    if (!res.ok) return "";
    const access = await res.json();
    return typeof access?.link === "string" ? access.link : "";
  } catch {
    return "";
  }
}

export interface ReminderDialogData {
  person: {
    id: string;
    name: string;
    firstName: string;
    phone: string | null;
  };
  territories: Array<{
    id: string;
    name: string;
    assignedOn: string | null;
    waitedFor: string | null;
  }>;

  // Champs supplémentaires éventuels pour le rendu du template
  [key: string]: unknown;
}

export interface ReminderDialogProps {
  onOpenChange?: (v: boolean) => void; // optional
  title?: string;
  description?: string;
  canSendWhatsApp: boolean;
  // Désactive le bouton d'ouverture "Rappeler tout" (préféré par le produit)
  triggerDisabled?: boolean;
  // Si vrai: toutes les attributions de la personne ont déjà un rappel → on désactive les actions
  disabledBecauseAllReminded?: boolean;
  onManualReminders: () => Promise<void> | void;
  onSendWhatsApp: (personId: string, message: string) => Promise<void> | void;
  data: ReminderDialogData; // contexte pour le rendu du message (ex: group/person/territories)
}

export function ReminderDialog({
  title,
  description = "Vous pouvez envoyer un message WhatsApp ou simplement enregistrer les rappels.",
  canSendWhatsApp,
  triggerDisabled = false,
  disabledBecauseAllReminded = false,
  onManualReminders,
  onSendWhatsApp,
  data,
}: ReminderDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  // `data` est recréé à chaque rendu du parent : on le lit via une ref pour ne pas relancer le
  // chargement (ni écraser le message en cours de saisie) à chaque rendu.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });

  // Charge le message type uniquement à l'ouverture de la boîte de dialogue
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      if (!canSendWhatsApp) {
        setMessage("");
        return;
      }
      setLoading(true);
      try {
        const res = await authFetch("/api/settings/late-reminder-message");
        if (res.ok) {
          const text = await res.text();
          if (!cancelled) {
            let result: string;
            if (text === null || text === undefined) {
              result = "";
            } else {
              result = renderTemplate(text, {
                ...dataRef.current,
                link: await fetchPersonLink(dataRef.current.person.id),
              });
            }
            setMessage(result);
          }
        }
      } catch {
        // ignore but show a gentle toast so user knows
        toast.error("Impossible de charger le message type");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, canSendWhatsApp]);

  const handleWhatsApp = async () => {
    if (!message.trim()) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSending(true);
    try {
      await onSendWhatsApp(data.person.id, message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="px-3 py-2 font-medium inline-flex items-center gap-2"
          disabled={triggerDisabled}
          title={
            triggerDisabled
              ? "Tous les territoires de cette personne ont déjà été rappelés"
              : undefined
          }
        >
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {disabledBecauseAllReminded && (
          <div className="text-sm text-muted-foreground">
            Tous les territoires de cette personne ont déjà été rappelés. Aucune
            action n&#39;est possible.
          </div>
        )}
        {!canSendWhatsApp && (
          <div className="text-sm text-muted-foreground ">
            Aucun numéro de téléphone n&#39;est associé à cette personne.
            L&#39;envoi WhatsApp est indisponible.
          </div>
        )}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          placeholder={
            canSendWhatsApp
              ? "Message WhatsApp (option WhatsApp)"
              : "Aucun numéro de téléphone — envoi WhatsApp indisponible"
          }
          disabled={
            loading || sending || !canSendWhatsApp || disabledBecauseAllReminded
          }
          className="min-h-32"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={sending}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            variant="outline"
            onClick={onManualReminders}
            disabled={sending || disabledBecauseAllReminded}
          >
            Marquer rappels envoyés
          </Button>
          <Button
            onClick={handleWhatsApp}
            disabled={
              sending ||
              loading ||
              !canSendWhatsApp ||
              disabledBecauseAllReminded ||
              message.trim().length === 0
            }
          >
            Envoyer par WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
