"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchMapThemes,
  saveMapThemes,
  setCachedMapThemes,
} from "@/lib/map-themes";
import {
  DEFAULT_MAP_THEMES,
  MAP_VIEWS,
  MapThemeSettings,
  MapView,
} from "@/models/map-view";
import { orderedThemes, PLAN_THEMES, PlanTheme } from "@/models/plan-theme";

type Maps = MapThemeSettings["maps"];

const sameMaps = (a: Maps, b: Maps) =>
  MAP_VIEWS.every(
    ({ id }) => (a[id] ?? []).join(",") === (b[id] ?? []).join(",")
  );

/**
 * Ce que montre le Plan IGN de chaque carte de l'application : un tableau thèmes × cartes. Les rues, leurs noms,
 * l'eau et les voies ferrées restent toujours. Pour la carte physique, c'est le choix proposé à sa génération.
 */
export function MapThemesSection() {
  const [saved, setSaved] = useState<Maps | null>(null);
  const [draft, setDraft] = useState<Maps | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMapThemes()
      .then((settings) => {
        if (cancelled) return;
        setSaved(settings.maps);
        setDraft(settings.maps);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (view: MapView, theme: PlanTheme, shown: boolean) =>
    setDraft((current) => {
      if (!current) return current;
      const themes = current[view] ?? [];
      return {
        ...current,
        [view]: orderedThemes(
          shown ? [...themes, theme] : themes.filter((id) => id !== theme)
        ),
      };
    });

  const unsaved = saved !== null && draft !== null && !sameMaps(saved, draft);
  const isDefault = draft !== null && sameMaps(draft, DEFAULT_MAP_THEMES);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const settings = await saveMapThemes({ maps: draft });
      setSaved(settings.maps);
      setDraft(settings.maps);
      // Les cartes ouvertes ensuite suivent le nouveau réglage, sans recharger la page
      setCachedMapThemes(settings);
      toast.success("Réglages des cartes enregistrés");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Le fond des cartes est le Plan IGN. Choisissez ce qu&apos;il montre sur
        chaque carte : les rues, leurs noms, l&apos;eau et les voies ferrées
        restent toujours. Pour la carte physique, c&apos;est le choix proposé à
        sa génération.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sur le plan</TableHead>
              {MAP_VIEWS.map((view) => (
                <TableHead
                  key={view.id}
                  title={view.description}
                  className="text-center whitespace-normal"
                >
                  {view.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLAN_THEMES.map((theme) => (
              <TableRow key={theme.id}>
                <TableCell className="whitespace-normal">
                  {theme.label}
                </TableCell>
                {MAP_VIEWS.map((view) => (
                  <TableCell key={view.id} className="text-center">
                    <Checkbox
                      aria-label={`${theme.label} sur la carte « ${view.label} »`}
                      checked={draft?.[view.id]?.includes(theme.id) ?? false}
                      disabled={draft === null}
                      onCheckedChange={(checked) =>
                        toggle(view.id, theme.id, checked === true)
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={!unsaved || saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setDraft(DEFAULT_MAP_THEMES)}
          disabled={draft === null || isDefault}
        >
          Valeurs par défaut
        </Button>
      </div>
    </div>
  );
}
