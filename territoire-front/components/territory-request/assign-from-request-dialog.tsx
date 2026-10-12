"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import {
  AvailableTerritory,
  TerritoryRequest,
} from "@/models/territory-request";
import {
  assignTerritoryToPerson,
  fetchAvailableTerritories,
} from "@/lib/territory-request-api";

const formatDay = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    dateStyle: "medium",
  });

type Props = {
  request: TerritoryRequest | null;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
};

/**
 * Choix d'un territoire disponible (dans la ville demandée) pour répondre à une demande. Les territoires les moins
 * récemment parcourus sont proposés en premier, le premier est présélectionné.
 */
export default function AssignFromRequestDialog({
  request,
  onOpenChange,
  onAssigned,
}: Props) {
  const [territories, setTerritories] = useState<AvailableTerritory[] | null>(
    null
  );
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setTerritories(null);
    setSelected("");
    fetchAvailableTerritories(request.id)
      .then((list) => {
        if (cancelled) return;
        setTerritories(list);
        setSelected(list[0]?.id ?? "");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setTerritories([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const assign = async () => {
    if (!request || !selected) return;
    const territory = territories?.find((t) => t.id === selected);
    setSaving(true);
    try {
      await assignTerritoryToPerson(selected, request.personId);
      toast.success(
        `${territory?.name ?? "Territoire"} attribué à ${request.personName}`
      );
      onOpenChange(false);
      onAssigned();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={request !== null} onOpenChange={onOpenChange}>
      {request && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Attribuer un territoire à {request.personName}
            </DialogTitle>
            <DialogDescription>
              {request.cityName
                ? `Territoires disponibles à ${request.cityName}`
                : "Territoires disponibles (pas de préférence de ville)"}
              , les moins récemment parcourus en premier.
            </DialogDescription>
          </DialogHeader>

          {request.comment && (
            <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-line">
              {request.comment}
            </p>
          )}

          {territories === null ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun territoire disponible
              {request.cityName ? ` à ${request.cityName}` : ""} pour le moment.
            </p>
          ) : (
            <RadioGroup
              value={selected}
              onValueChange={setSelected}
              className="max-h-72 gap-2 overflow-y-auto"
              aria-label="Territoire à attribuer"
            >
              {territories.map((territory) => (
                <label
                  key={territory.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[button[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={territory.id} />
                  <span className="font-medium">{territory.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      !request.cityName && territory.cityName,
                      territory.type && TYPE_TRANSLATIONS[territory.type],
                      territory.lastReturnDate
                        ? `parcouru le ${formatDay(territory.lastReturnDate)}`
                        : "jamais parcouru",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={assign} disabled={!selected || saving}>
              {saving ? "Attribution..." : "Attribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
