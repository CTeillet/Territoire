"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  fetchDurationSettings,
  saveDurationSettings,
} from "@/lib/duration-settings-api";
import { DurationSettings } from "@/models/duration-settings";

const MIN_MONTHS = 1;
const MAX_MONTHS = 24;

/** Nombre de mois saisi, ou null s'il n'est pas un entier entre 1 et 24 (mêmes bornes que le back). */
const parseMonths = (value: string): number | null => {
  const months = Number(value);
  return Number.isInteger(months) &&
    months >= MIN_MONTHS &&
    months <= MAX_MONTHS
    ? months
    : null;
};

/** Durée d'une attribution et durée d'attente d'un territoire rendu avant qu'il redevienne disponible. */
export function DurationsSection({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const [assignment, setAssignment] = useState("");
  const [pending, setPending] = useState("");
  const [saved, setSaved] = useState<DurationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = (settings: DurationSettings) => {
    setSaved(settings);
    setAssignment(String(settings.assignmentDurationMonths));
    setPending(String(settings.pendingDurationMonths));
  };

  useEffect(() => {
    let cancelled = false;
    fetchDurationSettings()
      .then((settings) => {
        if (!cancelled) apply(settings);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assignmentMonths = parseMonths(assignment);
  const pendingMonths = parseMonths(pending);
  const invalid = assignmentMonths === null || pendingMonths === null;
  const unsaved =
    saved !== null &&
    (assignmentMonths !== saved.assignmentDurationMonths ||
      pendingMonths !== saved.pendingDurationMonths);

  const onSave = async () => {
    if (assignmentMonths === null || pendingMonths === null) return;
    setSaving(true);
    try {
      apply(
        await saveDurationSettings({
          assignmentDurationMonths: assignmentMonths,
          pendingDurationMonths: pendingMonths,
        })
      );
      toast.success("Durées enregistrées");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <h2 className="text-lg font-semibold">Durées</h2>}
      <p className="text-sm text-muted-foreground">
        La durée d&apos;attribution fixe l&apos;échéance des nouvelles
        attributions et la prolongation par défaut ; les échéances en cours ne
        changent pas. Un territoire rendu reste en attente pendant la durée
        d&apos;attente, puis redevient disponible au traitement de nuit suivant.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignment-duration">
            Durée d&apos;attribution (mois)
          </Label>
          <Input
            id="assignment-duration"
            type="number"
            min={MIN_MONTHS}
            max={MAX_MONTHS}
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            className="w-40"
            disabled={saved === null}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pending-duration">Durée d&apos;attente (mois)</Label>
          <Input
            id="pending-duration"
            type="number"
            min={MIN_MONTHS}
            max={MAX_MONTHS}
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            className="w-40"
            disabled={saved === null}
          />
        </div>
      </div>
      {invalid && saved !== null && (
        <p role="alert" className="text-sm text-red-600">
          Chaque durée doit être un nombre entier de mois entre {MIN_MONTHS} et{" "}
          {MAX_MONTHS}.
        </p>
      )}

      <div>
        <Button onClick={onSave} disabled={invalid || !unsaved || saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
