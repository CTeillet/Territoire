"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Printer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  PrintCard,
  TerritoryPrintSheets,
} from "@/components/territory/print/territory-print-sheets";
import { useAuth } from "@/hooks/use-auth";
import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrintableMaps } from "@/hooks/use-printable-maps";
import { cn } from "@/lib/utils";
import { canManageAssignments } from "@/models/role";
import {
  CARDS_PER_SHEET,
  cityName,
  compareNames,
  MapState,
} from "@/lib/territory-print";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  fetchTerritories,
  updateTerritoryLost,
} from "@/store/slices/territory-slice";

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
  lost: boolean;
}

/** Sélection des territoires dont on imprime les cartes, 4 par feuille A4. */
export default function TerritoryPrintPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const territoriesGeojson = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );
  const loading = useAppSelector((state) => state.territories.loading);
  const user = useAppSelector((state) => state.auth.user);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [clearingLost, setClearingLost] = useState(false);

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
          lost: Boolean(properties.lost),
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

  // Une rubrique par ville : le nom de la ville n'est plus répété sur chaque territoire
  const visibleByCity = useMemo(() => {
    const groups = new Map<string, PrintableTerritory[]>();
    for (const t of visible) {
      groups.set(t.city, [...(groups.get(t.city) ?? []), t]);
    }
    return [...groups];
  }, [visible]);

  // Territoires dont la carte papier a disparu : proposés à la réimpression
  const lostTerritories = useMemo(
    () => territories.filter((t) => t.lost),
    [territories]
  );
  const lostToSelect = lostTerritories.filter(
    (t) => t.hasMap && !selected.has(t.id)
  );

  const selectedTerritories = useMemo(
    () => territories.filter((t) => selected.has(t.id)),
    [territories, selected]
  );
  const selectedLost = selectedTerritories.filter((t) => t.lost);
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

  const selectLost = () =>
    setSelected(
      (previous) => new Set([...previous, ...lostToSelect.map((t) => t.id)])
    );

  // Cartes réimprimées : les territoires ne sont plus proposés (ils restent sélectionnés)
  const clearLost = async () => {
    setClearingLost(true);
    const results = await Promise.allSettled(
      selectedLost.map((t) =>
        dispatch(
          updateTerritoryLost({ territoryId: t.id, lost: false })
        ).unwrap()
      )
    );
    setClearingLost(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    const cleared = results.length - failed;
    if (cleared > 0) {
      toast.success(
        cleared > 1
          ? `${cleared} territoires retirés des perdus.`
          : "Territoire retiré des perdus."
      );
    }
    if (failed > 0) {
      toast.error(
        failed > 1
          ? `${failed} territoires n'ont pas pu être retirés des perdus.`
          : "Un territoire n'a pas pu être retiré des perdus."
      );
    }
  };

  if (!isClient) return null;

  // Sur téléphone, la barre reste en bas de l'écran : pas besoin de faire défiler la liste pour imprimer
  const printBar = (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        isMobile &&
          "sticky bottom-0 z-20 -mx-4 flex-nowrap gap-3 border-t bg-white px-4 py-3"
      )}
    >
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
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">
          Impression des cartes
        </h1>
        <p className="text-muted-foreground">
          Les cartes des territoires sélectionnés sont imprimées par 4 sur des
          feuilles A4 en paysage, à découper le long des pointillés.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {/* En deux colonnes, la sélection reste à l'écran pendant qu'on fait défiler l'aperçu */}
        <div className="space-y-3 rounded-md border bg-white p-4 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100svh-3rem)] lg:flex-col">
          {lostTerritories.length > 0 && (
            <section
              aria-label="Territoires perdus"
              className="space-y-2 rounded-md border border-orange-300 bg-orange-50 p-3"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {plural(
                  lostTerritories.length,
                  "territoire perdu à réimprimer",
                  "territoires perdus à réimprimer"
                )}
              </h2>
              <p className="text-sm">
                {lostTerritories
                  .map((t) => (t.hasMap ? t.name : `${t.name} (sans carte)`))
                  .join(", ")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={selectLost}
                disabled={lostToSelect.length === 0}
              >
                Sélectionner les territoires perdus
              </Button>
            </section>
          )}
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
            className="h-9 w-full rounded-md border bg-white px-2 text-base md:text-sm"
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
            <div className="max-h-[45vh] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {visibleByCity.map(([cityLabel, cityTerritories]) => (
                <section key={cityLabel} aria-label={cityLabel || "Sans ville"}>
                  <h3 className="sticky top-0 z-[1] bg-white py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cityLabel || "Sans ville"} · {cityTerritories.length}
                  </h3>
                  {/* Noms courts : une grille de pastilles au lieu d'une ligne par territoire */}
                  <ul className="mb-2 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
                    {cityTerritories.map((t) => (
                      <li key={t.id}>
                        <label
                          title={
                            t.hasMap
                              ? t.name
                              : `${t.name} : pas de carte à imprimer`
                          }
                          className={cn(
                            "flex h-10 items-center gap-2 rounded-md border px-2 text-sm",
                            t.hasMap
                              ? "cursor-pointer hover:bg-gray-50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-gray-100"
                              : "border-dashed text-gray-400",
                            t.lost && "border-orange-400"
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
                          <span className="min-w-0 truncate font-medium">
                            {t.name}
                          </span>
                          {t.lost && (
                            <span
                              aria-hidden="true"
                              className="ml-auto size-2 shrink-0 rounded-full bg-orange-500"
                            />
                          )}
                          {t.lost && <span className="sr-only">perdu</span>}
                          {!t.hasMap && (
                            <span className="sr-only">sans carte</span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {visible.length === 0 && (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  Aucun territoire.
                </p>
              )}
            </div>
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-orange-500"
              />
              Perdu
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-3 w-4 rounded-sm border border-dashed border-gray-400"
              />
              Sans carte
            </span>
          </p>
        </div>

        <div className="space-y-4">
          {!isMobile && printBar}

          {selectedLost.length > 0 && canManageAssignments(user?.role) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm">
              <p>
                {selectedLost.length > 1
                  ? `${selectedLost.length} territoires perdus sélectionnés : une fois leurs cartes imprimées, retirez-les des perdus.`
                  : `${selectedLost[0].name} est perdu : une fois sa carte imprimée, retirez-le des perdus.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLost}
                disabled={clearingLost}
              >
                Retirer des perdus
              </Button>
            </div>
          )}

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

      {isMobile && printBar}

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
