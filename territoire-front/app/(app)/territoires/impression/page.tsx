"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  PrintCard,
  TerritoryPrintSheets,
} from "@/components/territory/print/territory-print-sheets";
import { useAuth } from "@/hooks/use-auth";
import { useIsClient } from "@/hooks/use-is-client";
import { usePrintableMaps } from "@/hooks/use-printable-maps";
import { cn } from "@/lib/utils";
import {
  CARDS_PER_SHEET,
  cityName,
  compareNames,
  MapState,
} from "@/lib/territory-print";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";

// À l'impression, seules les feuilles (rendues dans <body> par un portail) sont visibles, en A4 paysage sans marge
const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
@media print {
  body > :not(.territory-print) { display: none !important; }
}
`;

const LOADING: MapState = { status: "loading" };

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count > 1 ? pluralForm : singular}`;

interface PrintableTerritory {
  id: string;
  name: string;
  city: string;
  hasMap: boolean;
}

/** Sélection des territoires dont on imprime les cartes, 4 par feuille A4. */
export default function TerritoryPrintPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const isClient = useIsClient();
  const territoriesGeojson = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );
  const loading = useAppSelector((state) => state.territories.loading);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchTerritories());
    }
  }, [dispatch, isAuthenticated]);

  // Par ville puis par nom (PVP2 avant PVP10) : c'est aussi l'ordre des cartes sur les feuilles
  const territories = useMemo<PrintableTerritory[]>(
    () =>
      (territoriesGeojson?.features ?? [])
        .map(({ properties }) => ({
          id: properties.id,
          name: properties.name ?? "",
          city: cityName(properties),
          hasMap: Boolean(properties.territoryMapId),
        }))
        .sort(
          (a, b) => compareNames(a.city, b.city) || compareNames(a.name, b.name)
        ),
    [territoriesGeojson]
  );
  const cities = useMemo(
    () => [...new Set(territories.map((t) => t.city))].filter(Boolean),
    [territories]
  );
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return territories.filter(
      (t) =>
        (!city || t.city === city) &&
        (!query || t.name.toLocaleLowerCase("fr").includes(query))
    );
  }, [territories, city, search]);

  const selectedTerritories = useMemo(
    () => territories.filter((t) => selected.has(t.id)),
    [territories, selected]
  );
  const selectedIds = useMemo(
    () => selectedTerritories.map((t) => t.id),
    [selectedTerritories]
  );
  const maps = usePrintableMaps(selectedIds);
  const cards: PrintCard[] = selectedTerritories.map((t) => ({
    id: t.id,
    name: t.name,
    map: maps[t.id] ?? LOADING,
  }));
  const loadingCount = cards.filter((c) => c.map.status === "loading").length;
  const errorCount = cards.filter((c) => c.map.status === "error").length;
  const sheetCount = Math.ceil(cards.length / CARDS_PER_SHEET);

  const toggle = (id: string, checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const selectVisible = () =>
    setSelected(
      (previous) =>
        new Set([
          ...previous,
          ...visible.filter((t) => t.hasMap).map((t) => t.id),
        ])
    );

  if (!isClient) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Impression des cartes</h1>
        <p className="text-muted-foreground">
          Les cartes des territoires sélectionnés sont imprimées par 4 sur des
          feuilles A4 en paysage, à découper le long des pointillés.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {/* En deux colonnes, la sélection reste à l'écran pendant qu'on fait défiler l'aperçu */}
        <div className="space-y-3 rounded-md border bg-white p-4 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100svh-3rem)] lg:flex-col">
          <Input
            placeholder="Rechercher un territoire"
            aria-label="Rechercher un territoire"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Ville"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
          >
            <option value="">Toutes les villes</option>
            {cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectVisible}>
              Tout sélectionner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
            >
              Tout désélectionner
            </Button>
          </div>

          {loading && territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chargement des territoires...
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {visible.map((t) => (
                <li key={t.id}>
                  <label
                    className={cn(
                      "flex items-center gap-3 rounded px-2 py-1.5",
                      t.hasMap
                        ? "cursor-pointer hover:bg-gray-100"
                        : "text-gray-400"
                    )}
                  >
                    <Checkbox
                      aria-label={`${t.name}, ${t.city}`}
                      checked={selected.has(t.id)}
                      disabled={!t.hasMap}
                      onCheckedChange={(checked) =>
                        toggle(t.id, checked === true)
                      }
                    />
                    <span className="font-medium">{t.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {t.city}
                    </span>
                    {!t.hasMap && (
                      <span className="ml-auto text-xs italic">sans carte</span>
                    )}
                  </label>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="px-2 py-1.5 text-sm text-muted-foreground">
                  Aucun territoire.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p>
                {plural(
                  cards.length,
                  "territoire sélectionné",
                  "territoires sélectionnés"
                )}{" "}
                · {plural(sheetCount, "feuille A4", "feuilles A4")}
              </p>
              {errorCount > 0 && (
                <p className="text-red-600">
                  {errorCount > 1
                    ? `${errorCount} cartes n'ont pas pu être chargées.`
                    : "1 carte n'a pas pu être chargée."}
                </p>
              )}
            </div>
            <Button
              onClick={() => window.print()}
              disabled={cards.length === 0 || loadingCount > 0}
            >
              <Printer className="h-4 w-4" />
              {loadingCount > 0
                ? `Chargement des cartes (${cards.length - loadingCount}/${cards.length})`
                : "Imprimer"}
            </Button>
          </div>

          {cards.length === 0 ? (
            <p className="rounded-md border border-dashed bg-white p-10 text-center text-muted-foreground">
              Sélectionnez des territoires pour voir l&apos;aperçu des feuilles.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Dans la fenêtre d&apos;impression, gardez l&apos;échelle à 100 %
                (taille réelle).
              </p>
              <div className="space-y-6">
                <TerritoryPrintSheets cards={cards} className="shadow-md" />
              </div>
            </>
          )}
        </div>
      </div>

      {cards.length > 0 &&
        createPortal(
          <div className="territory-print hidden print:block">
            <TerritoryPrintSheets cards={cards} />
          </div>,
          document.body
        )}
      <style>{PRINT_CSS}</style>
    </div>
  );
}
