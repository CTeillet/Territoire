"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUser, Loader2, MapPinned, Search } from "lucide-react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  dashboardItems,
  otherItems,
  territoryItems,
} from "@/components/navigation-items";
import { useAuth } from "@/hooks/use-auth";
import { useIsClient } from "@/hooks/use-is-client";
import { canSendAccess } from "@/lib/person-access-api";
import { filterBySearch, NO_MATCH } from "@/lib/search";
import { territorySearchRanks } from "@/lib/territory-search";
import { TerritoryStatusBadge } from "@/components/territory/territory-status-badge";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";
import { fetchPersons } from "@/store/slices/person-slice";
import { cn } from "@/lib/utils";

/** Événement qui ouvre la recherche rapide depuis n'importe quel bouton. */
export const QUICK_SEARCH_EVENT = "tms:recherche-rapide";

export function openQuickSearch() {
  window.dispatchEvent(new Event(QUICK_SEARCH_EVENT));
}

const MAX_TERRITORIES = 8;
const MAX_PERSONS = 6;
/** Valeur absente telle que l'envoie le back (ex. territoire non attribué). */
const NOT_SET = "N/A";

const pages = [...dashboardItems, ...territoryItems, ...otherItems];

const compareNames = (a: string, b: string) =>
  a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

/** Raccourci affiché : ⌘K sur Mac, Ctrl K ailleurs (connu seulement dans le navigateur). */
export function useQuickSearchShortcut() {
  const isClient = useIsClient();
  const isMac =
    isClient && /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "");
  return isMac ? "⌘K" : "Ctrl K";
}

/**
 * Recherche rapide (Ctrl+K ou ⌘K, ou les boutons « Rechercher ») : territoires, personnes et rubriques,
 * depuis n'importe quelle page. Les territoires et les personnes sont chargés à la première ouverture.
 */
export function QuickSearch() {
  const { isAuthenticated, user } = useAuth();
  const isClient = useIsClient();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const territories = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );
  const territoriesLoading = useAppSelector(
    (state) => state.territories.loading
  );
  const persons = useAppSelector((state) => state.persons.persons);
  const personsLoading = useAppSelector(
    (state) => state.persons.isFetchingPersons
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(QUICK_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(QUICK_SEARCH_EVENT, onOpen);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    if (!territories && !territoriesLoading) dispatch(fetchTerritories());
    if (persons.length === 0) dispatch(fetchPersons());
    // Chargement à l'ouverture seulement, pas à chaque mise à jour des listes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAuthenticated]);

  const searching = query.trim() !== "";

  const pageResults = useMemo(
    () =>
      filterBySearch(
        pages.filter(
          (page) => page.url !== "/demandes" || canSendAccess(user?.role)
        ),
        query,
        (page) => [page.title]
      ),
    [query, user?.role]
  );

  const territoryResults = useMemo(() => {
    if (!searching || !territories) return [];
    const list = territories.features.map((f) => f.properties);
    const ranks = territorySearchRanks(list, query);
    return list
      .map((territory, index) => ({ territory, rank: ranks[index] }))
      .filter(({ rank }) => rank !== NO_MATCH)
      .sort(
        (a, b) =>
          a.rank - b.rank || compareNames(a.territory.name, b.territory.name)
      )
      .slice(0, MAX_TERRITORIES)
      .map(({ territory }) => territory);
  }, [searching, territories, query]);

  const personResults = useMemo(() => {
    if (!searching) return [];
    return filterBySearch(persons, query, (person) => [
      person.firstName,
      person.lastName,
      person.email,
    ])
      .sort(
        (a, b) =>
          compareNames(a.lastName, b.lastName) ||
          compareNames(a.firstName, b.firstName)
      )
      .slice(0, MAX_PERSONS);
  }, [searching, persons, query]);

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  const loading =
    searching &&
    ((!territories && territoriesLoading) ||
      (persons.length === 0 && personsLoading));
  const nothing =
    pageResults.length === 0 &&
    territoryResults.length === 0 &&
    personResults.length === 0;

  // Rien au rendu serveur ni à l'hydratation (la session n'est connue que du navigateur), et rien tant que
  // la recherche est fermée : le titre masqué de la fenêtre n'a pas à rester dans la page
  if (!isClient || !isAuthenticated || !open) return null;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="Recherche rapide"
      description="Territoires, personnes et rubriques de l'application"
      // Ctrl+K referme la recherche : pas de raccourcis « vim » de cmdk (Ctrl+K y remonte d'une ligne)
      commandProps={{
        shouldFilter: false,
        label: "Recherche rapide",
        vimBindings: false,
      }}
      className="top-4 translate-y-0 sm:top-[15%]"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Territoire, personne, rubrique…"
        className="text-base md:text-sm"
      />
      <CommandList className="max-h-[60vh]">
        {loading && nothing ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-gray-600">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Chargement…
          </p>
        ) : nothing ? (
          <p className="py-6 text-center text-sm text-gray-600">
            Aucun résultat
          </p>
        ) : null}

        {territoryResults.length > 0 && (
          <CommandGroup heading="Territoires">
            {territoryResults.map((territory) => (
              <CommandItem
                key={territory.id}
                value={`territoire-${territory.id}`}
                onSelect={() => go(`/territoires/${territory.id}`)}
              >
                <MapPinned aria-hidden="true" />
                <span className="shrink-0 font-medium whitespace-nowrap">
                  {territory.name}
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  {typeof territory.city === "string"
                    ? territory.city
                    : territory.city?.name}
                  {territory.assignedTo &&
                    territory.assignedTo !== NOT_SET &&
                    ` · ${territory.assignedTo}`}
                </span>
                <TerritoryStatusBadge
                  status={territory.status}
                  className="ml-auto"
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {personResults.length > 0 && (
          <CommandGroup heading="Personnes">
            {personResults.map((person) => (
              <CommandItem
                key={person.id}
                value={`personne-${person.id}`}
                onSelect={() => go(`/personnes/${person.id}`)}
              >
                <FileUser aria-hidden="true" />
                {person.firstName} {person.lastName}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {pageResults.length > 0 && (
          <CommandGroup heading="Rubriques">
            {pageResults.map((page) => (
              <CommandItem
                key={page.url}
                value={`rubrique-${page.url}`}
                onSelect={() => go(page.url)}
              >
                <page.icon aria-hidden="true" />
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Bouton « Rechercher » de la barre du haut sur téléphone. */
export function QuickSearchButton({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const isClient = useIsClient();
  if (!isClient || !isAuthenticated) return null;
  return (
    <button
      type="button"
      onClick={openQuickSearch}
      aria-label="Recherche rapide"
      className={cn(
        "flex size-11 items-center justify-center rounded-md text-gray-700 outline-none hover:bg-gray-300 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
    >
      <Search aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
