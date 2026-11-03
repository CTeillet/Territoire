"use client";

import React, { useId, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { Checkbox } from "@/components/ui/checkbox";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";
import { renderTemplate } from "@/lib/template";
import { cn } from "@/lib/utils";

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

/** Message type rendu, ou null si le rendu échoue. */
function renderMessage(template: string, context: unknown): string | null {
  try {
    return renderTemplate(template, context);
  } catch {
    return null;
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
    // Déjà rappelé pendant l'attribution en cours : non sélectionné à l'ouverture
    reminded?: boolean;
  }>;

  // Champs supplémentaires éventuels pour le rendu du template
  [key: string]: unknown;
}

export interface ReminderDialogProps {
  onOpenChange?: (v: boolean) => void; // optional
  title?: string;
  description?: string;
  canSendWhatsApp: boolean;
  // Désactive le bouton d'ouverture "Rappeler" (préféré par le produit)
  triggerDisabled?: boolean;
  triggerClassName?: string;
  // Si vrai: toutes les attributions de la personne ont déjà un rappel → on désactive les actions
  disabledBecauseAllReminded?: boolean;
  // Les actions ne portent que sur les territoires sélectionnés dans la boîte de dialogue
  onManualReminders: (territoryIds: string[]) => Promise<void> | void;
  onSendWhatsApp: (
    personId: string,
    message: string,
    territoryIds: string[]
  ) => Promise<void> | void;
  data: ReminderDialogData; // contexte pour le rendu du message (ex: group/person/territories)
}

export function ReminderDialog({
  title,
  description = "Vous pouvez envoyer un message WhatsApp ou simplement enregistrer les rappels.",
  canSendWhatsApp,
  triggerDisabled = false,
  triggerClassName,
  disabledBecauseAllReminded = false,
  onManualReminders,
  onSendWhatsApp,
  data,
}: ReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState<string | null>(null);
  const [link, setLink] = useState("");
  // Message saisi par l'utilisateur ; null tant qu'il suit le message type
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const idPrefix = useId();
  // Ignore la réponse d'un chargement dépassé par une nouvelle ouverture
  const loadCount = useRef(0);

  const loadTemplate = async (personId: string) => {
    const current = ++loadCount.current;
    setLoading(true);
    try {
      const res = await authFetch("/api/settings/late-reminder-message");
      if (!res.ok) return;
      const text = await res.text();
      const personLink = await fetchPersonLink(personId);
      if (current === loadCount.current) {
        setTemplate(text);
        setLink(personLink);
      }
    } catch {
      // ignore but show a gentle toast so user knows
      toast.error("Impossible de charger le message type");
    } finally {
      if (current === loadCount.current) setLoading(false);
    }
  };

  // À chaque ouverture : territoires sans rappel sélectionnés, message type rechargé
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setSelectedIds(
      data.territories.filter((t) => !t.reminded).map((t) => t.id)
    );
    setTemplate(null);
    setCustomMessage(null);
    if (canSendWhatsApp) loadTemplate(data.person.id);
  };

  const toggleTerritory = (id: string, checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );

  const selectedTerritories = data.territories.filter((t) =>
    selectedIds.includes(t.id)
  );
  const selectedTerritoryIds = selectedTerritories.map((t) => t.id);
  // Un rappel doit concerner au moins un territoire pas encore rappelé
  const hasTerritoryToRemind = selectedTerritories.some((t) => !t.reminded);

  // Le message type ne mentionne que les territoires sélectionnés
  const generatedMessage =
    open && template !== null && customMessage === null
      ? renderMessage(template, {
          ...data,
          territories: selectedTerritories,
          link,
        })
      : "";
  const message = customMessage ?? generatedMessage ?? "";

  const handleWhatsApp = async () => {
    if (!message.trim()) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSending(true);
    try {
      await onSendWhatsApp(data.person.id, message, selectedTerritoryIds);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "px-3 py-2 font-medium inline-flex items-center gap-2",
            triggerClassName
          )}
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
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Territoires à rappeler
          </legend>
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
            {data.territories.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  id={`${idPrefix}-${t.id}`}
                  checked={selectedIds.includes(t.id)}
                  disabled={sending}
                  onCheckedChange={(checked) =>
                    toggleTerritory(t.id, checked === true)
                  }
                />
                <label
                  htmlFor={`${idPrefix}-${t.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">
                    {t.reminded && "Déjà rappelé · "}
                    {t.waitedFor
                      ? `échéance ${format(new Date(t.waitedFor), "dd MMM yyyy", { locale: fr })}`
                      : "sans échéance"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!hasTerritoryToRemind && (
            <p className="text-sm text-muted-foreground">
              Sélectionnez au moins un territoire pas encore rappelé.
            </p>
          )}
        </fieldset>
        {!canSendWhatsApp && (
          <div className="text-sm text-muted-foreground ">
            Aucun numéro de téléphone n&#39;est associé à cette personne.
            L&#39;envoi WhatsApp est indisponible.
          </div>
        )}
        <Textarea
          value={message}
          onChange={(e) => setCustomMessage(e.target.value)}
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
        {generatedMessage === null && (
          <p className="text-sm text-destructive">
            Le message type n&#39;a pas pu être généré.
          </p>
        )}
        {customMessage !== null && template !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Message modifié : il ne suit plus la sélection.</span>
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => setCustomMessage(null)}
              disabled={sending}
            >
              Régénérer le message
            </Button>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={sending}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            variant="outline"
            onClick={() => onManualReminders(selectedTerritoryIds)}
            disabled={
              sending || disabledBecauseAllReminded || !hasTerritoryToRemind
            }
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
              !hasTerritoryToRemind ||
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
