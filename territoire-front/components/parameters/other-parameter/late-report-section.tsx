"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  fetchLateReportSettings,
  saveLateReportRecipients,
  sendLateReportNow,
} from "@/lib/late-report-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Adresses saisies, séparées par des virgules, des points-virgules ou des espaces. */
export const parseRecipients = (value: string) =>
  value.split(/[\s,;]+/).filter(Boolean);

const lateCount = (count: number) =>
  count === 0
    ? "aucun territoire en retard"
    : `${count} territoire${count > 1 ? "s" : ""} en retard`;

/** Destinataires du récapitulatif hebdomadaire des territoires en retard, et envoi immédiat pour tester. */
export function LateReportSection({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const [recipients, setRecipients] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [mailConfigured, setMailConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLateReportSettings()
      .then((settings) => {
        if (cancelled) return;
        setSaved(settings.recipients);
        setRecipients(settings.recipients.join(", "));
        setMailConfigured(settings.mailConfigured);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unsaved = parseRecipients(recipients).join(",") !== saved.join(",");

  const onSave = async () => {
    const list = parseRecipients(recipients);
    const invalid = list.find((r) => !EMAIL.test(r));
    if (invalid) {
      toast.error(`Adresse e-mail invalide : ${invalid}`);
      return;
    }
    setSaving(true);
    try {
      const settings = await saveLateReportRecipients(list);
      setSaved(settings.recipients);
      setRecipients(settings.recipients.join(", "));
      toast.success(
        settings.recipients.length > 0
          ? "Destinataires enregistrés"
          : "Récapitulatif désactivé"
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSend = async () => {
    setSending(true);
    try {
      const result = await sendLateReportNow();
      toast.success(
        `Récapitulatif envoyé à ${result.recipients.join(", ")} (${lateCount(result.lateTerritories)})`
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && (
        <h2 className="text-lg font-semibold">
          Récapitulatif des retards par e-mail
        </h2>
      )}
      <p className="text-sm text-muted-foreground">
        Chaque lundi à 8 h, la liste des territoires en retard (personne,
        échéance, dernière relance) est envoyée à ces adresses. Laisser vide
        pour ne rien envoyer.
      </p>
      {!loading && !mailConfigured && (
        <p role="alert" className="text-sm text-amber-700">
          Aucun serveur d&apos;envoi n&apos;est configuré : renseigner
          MAIL_HOST, MAIL_USERNAME et MAIL_PASSWORD sur le serveur. Rien ne sera
          envoyé d&apos;ici là.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="late-report-recipients">Destinataires</Label>
        <Input
          id="late-report-recipients"
          type="text"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="prenom.nom@exemple.fr, autre@exemple.fr"
          className="max-w-xl"
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={loading || saving || !unsaved}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          variant="secondary"
          onClick={onSend}
          disabled={!mailConfigured || saved.length === 0 || unsaved || sending}
          className="inline-flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "Envoi..." : "Envoyer maintenant"}
        </Button>
      </div>
    </div>
  );
}
