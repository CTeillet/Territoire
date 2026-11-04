"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPinPlus } from "lucide-react";
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
import { labelAfterAssignment } from "@/components/shared/assignment-label-file";
import { Person } from "@/models/person";
import { Assignment } from "@/models/assignment";
import { TerritoryType, TYPE_TRANSLATIONS } from "@/models/territory-type";
import {
  suggestTerritories,
  territoryCityName,
} from "@/lib/territory-suggestion";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  assignTerritory,
  fetchTerritories,
} from "@/store/slices/territory-slice";
import { fetchAssignedTerritories } from "@/store/slices/person-slice";

/** Suggestions affichées d'abord ; les suivantes sur demande. */
const FIRST_SUGGESTIONS = 8;

const formatDay = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    dateStyle: "medium",
  });

const selectClass =
  "h-11 w-full rounded-md border bg-white px-2 text-base md:h-9 md:text-sm";

/**
 * Attribution d'un territoire depuis la fiche d'une personne : les territoires disponibles les plus indiqués
 * d'abord (jamais ou le moins récemment parcourus, pas ceux qu'elle a eus récemment), filtrables par ville et
 * par type. L'étiquette s'imprime comme pour toute attribution.
 */
export function AssignTerritoryToPersonDialog({
  person,
  history,
}: {
  person: Person;
  /** Attributions de la personne, pour éviter de lui redonner un territoire qu'elle vient d'avoir. */
  history: Assignment[];
}) {
  const dispatch = useAppDispatch();
  const territoriesGeojson = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );
  const loading = useAppSelector((state) => state.territories.loading);
  const [open, setOpen] = useState(false);
  const [cityName, setCityName] = useState("");
  const [type, setType] = useState<TerritoryType | "">("");
  const [selected, setSelected] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const fullName = `${person.firstName} ${person.lastName}`;

  useEffect(() => {
    if (open && !territoriesGeojson && !loading) dispatch(fetchTerritories());
    // Chargement à l'ouverture seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const territories = useMemo(
    () => territoriesGeojson?.features.map((f) => f.properties) ?? [],
    [territoriesGeojson]
  );
  const cities = useMemo(
    () =>
      [
        ...new Set(
          territories
            .filter((t) => t.status === "AVAILABLE")
            .map(territoryCityName)
            .filter((name): name is string => !!name)
        ),
      ].sort((a, b) => a.localeCompare(b, "fr")),
    [territories]
  );
  const suggestions = useMemo(
    () =>
      suggestTerritories(territories, {
        cityName: cityName || null,
        type: type || null,
        history,
      }),
    [territories, cityName, type, history]
  );
  const shown = showAll ? suggestions : suggestions.slice(0, FIRST_SUGGESTIONS);
  const running = history.filter((a) => a.returnDate === null).length;

  const reset = () => {
    setSelected("");
    setShowAll(false);
  };

  const assign = async () => {
    const choice = suggestions.find((s) => s.territory.id === selected);
    if (!choice || !person.id) return;
    setSaving(true);
    try {
      const assignment = await dispatch(
        assignTerritory({ territoryId: selected, personId: person.id })
      ).unwrap();
      toast.success(`${choice.territory.name} attribué à ${fullName}`);
      void labelAfterAssignment(assignment);
      dispatch(fetchAssignedTerritories(person.id));
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : "Erreur lors de l'assignation du territoire"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-11 w-full sm:h-9 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <MapPinPlus aria-hidden="true" />
        Attribuer un territoire
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attribuer un territoire à {fullName}</DialogTitle>
            <DialogDescription>
              Territoires disponibles : jamais ou le moins récemment parcourus
              d&apos;abord, ceux que {person.firstName} a eus ces deux dernières
              années en dernier.
            </DialogDescription>
          </DialogHeader>

          {running > 0 && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {person.firstName} a déjà {running}{" "}
              {running > 1 ? "territoires" : "territoire"} en cours.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Ville</span>
              <select
                className={selectClass}
                value={cityName}
                onChange={(e) => {
                  setCityName(e.target.value);
                  reset();
                }}
              >
                <option value="">Toutes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Type</span>
              <select
                className={selectClass}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as TerritoryType | "");
                  reset();
                }}
              >
                <option value="">Tous</option>
                <option value={TerritoryType.HOUSE}>Pavillon</option>
                <option value={TerritoryType.BUILDING}>Immeuble</option>
              </select>
            </label>
          </div>

          {!territoriesGeojson ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun territoire disponible avec ces critères pour le moment.
            </p>
          ) : (
            <RadioGroup
              value={selected}
              onValueChange={setSelected}
              className="max-h-72 gap-2 overflow-y-auto"
              aria-label="Territoire à attribuer"
            >
              {shown.map(({ territory, lastVisitedOn, recentlyHadOn }) => (
                <label
                  key={territory.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[button[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={territory.id} />
                  <span className="font-medium whitespace-nowrap">
                    {territory.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      !cityName && territoryCityName(territory),
                      territory.type && TYPE_TRANSLATIONS[territory.type],
                      lastVisitedOn
                        ? `parcouru le ${formatDay(lastVisitedOn)}`
                        : "jamais parcouru",
                      recentlyHadOn &&
                        `déjà eu par ${person.firstName} le ${formatDay(recentlyHadOn)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
          {!showAll && suggestions.length > FIRST_SUGGESTIONS && (
            <Button
              variant="link"
              className="h-auto self-start p-0"
              onClick={() => setShowAll(true)}
            >
              Voir les {suggestions.length - FIRST_SUGGESTIONS} autres
            </Button>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={assign} disabled={!selected || saving}>
              {saving ? "Attribution..." : "Attribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
