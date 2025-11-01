"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";

export function LateReminderMessage({ showTitle = true }: { showTitle?: boolean }) {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await authFetch("/api/settings/late-reminder-message");
        if (res.ok) {
          const text = await res.text();
          if (!cancelled) setMessage(text ?? "");
        } else {
          toast.error("Impossible de charger le message de relance");
        }
      } catch {
        toast.error("Erreur réseau lors du chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier le message");
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/late-reminder-message", {
        method: "PUT",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: message ?? "",
      });
      if (res.ok) {
        toast.success("Message enregistré");
      } else {
        toast.error("Échec de l'enregistrement du message");
      }
    } catch {
      toast.error("Erreur réseau lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <h2 className="text-lg font-semibold">Message type de relance (territoires en retard)</h2>}
      <p className="text-sm text-muted-foreground">Saisissez votre message puis sauvegardez pour réutilisation.</p>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        className="min-h-40"
        placeholder="Saisissez ici le message de relance à utiliser..."
        disabled={loading}
      />
      <div className="flex gap-2">
        <Button onClick={onCopy} variant="secondary" className="inline-flex items-center gap-2" disabled={loading || message.trim().length === 0}>
          <Copy className="w-4 h-4" /> Copier le message
        </Button>
        <Button onClick={onSave} disabled={loading || saving}>
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
}
