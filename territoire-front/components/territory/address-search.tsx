"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { TerritoryNameLink } from "@/components/territory/territory-name-link";
import { getBadgeColor } from "@/components/utils";
import {
  ADDRESS_MIN_LENGTH,
  AddressResult,
  searchAddresses,
  territoriesAtPoint,
} from "@/lib/address-search";
import { formatDistance, LatLng } from "@/lib/geo";
import { STATUS_TRANSLATIONS } from "@/models/territory-status";
import { TerritoryFeature } from "@/models/territory";

const DEBOUNCE_MS = 300;
/** Valeur absente telle que l'envoie le back (ex. territoire non attribué). */
const NOT_SET = "N/A";

/** Adresse choisie et territoires trouvés (ceux qui la contiennent d'abord, puis les plus proches). */
export type AddressSelection = AddressResult & { territoryIds: string[] };

function TerritorySummary({ feature }: { feature: TerritoryFeature }) {
  const { id, name, status, assignedTo } = feature.properties;
  return (
    // Espaces entre les éléments : lus comme une phrase (« R-14 Attribué Jean Dupont »)
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <TerritoryNameLink id={id} name={name} />{" "}
      <Badge className={`${getBadgeColor(status)} text-white`}>
        {STATUS_TRANSLATIONS[status]}
      </Badge>
      {assignedTo && assignedTo !== NOT_SET && (
        <>
          {" "}
          <span className="text-gray-600">{assignedTo}</span>
        </>
      )}
    </span>
  );
}

/**
 * Recherche d'une adresse : suggestions de la Géoplateforme pendant la saisie, puis les territoires de
 * l'adresse choisie (celui qui la contient, ou les plus proches si elle n'est dans aucun).
 */
export function AddressSearch({
  features,
  near,
  selection,
  onSelect,
}: {
  features: TerritoryFeature[];
  /** Centre des territoires : les adresses les plus proches sont proposées d'abord. */
  near: LatLng | null;
  selection: AddressSelection | null;
  onSelect: (selection: AddressSelection | null) => void;
}) {
  const [query, setQuery] = useState(selection?.label ?? "");
  // Réponse du service, avec la saisie à laquelle elle répond : une autre saisie attend la sienne
  const [found, setFound] = useState<{
    query: string;
    results: AddressResult[];
    error: string | null;
  } | null>(null);
  const q = query.trim();
  // Suggestions affichées pendant la saisie, plus après le choix d'une adresse
  const typing = q !== (selection?.label ?? "");

  useEffect(() => {
    if (!typing || q.length < ADDRESS_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchAddresses(q, near, controller.signal)
        .then((results) => setFound({ query: q, results, error: null }))
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          setFound({ query: q, results: [], error: e.message });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, typing, near]);

  const current = found?.query === q ? found : null;

  const located = useMemo(
    () => (selection ? territoriesAtPoint(selection, features) : null),
    [selection, features]
  );

  const choose = (address: AddressResult) => {
    const { containing, nearby } = territoriesAtPoint(address, features);
    setQuery(address.label);
    onSelect({
      ...address,
      territoryIds: [
        ...containing.map((f) => f.properties.id),
        ...nearby.map((n) => n.feature.properties.id),
      ],
    });
  };

  const clear = () => {
    setQuery("");
    setFound(null);
    onSelect(null);
  };

  const showList = typing && q.length >= ADDRESS_MIN_LENGTH;

  return (
    <div className="space-y-3">
      <Command
        shouldFilter={false}
        // Nom du champ (cmdk le relie à son input)
        label="Rechercher une adresse"
        className="relative h-auto overflow-visible rounded-md border bg-white"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === "Escape") clear();
          }}
          placeholder="12 rue Victor Hugo, Paray-Vieille-Poste"
          className="h-11 text-base md:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Effacer l'adresse"
            className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-md text-gray-500 outline-none hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        {showList && (
          <CommandList className="absolute top-full right-0 left-0 z-[1000] mt-1 rounded-md border bg-white shadow-lg">
            {!current ? (
              <p className="flex items-center gap-2 px-3 py-3 text-sm text-gray-600">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Recherche de l&apos;adresse…
              </p>
            ) : current.error ? (
              <p role="alert" className="px-3 py-3 text-sm text-red-600">
                {current.error}
              </p>
            ) : current.results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-600">
                Aucune adresse trouvée
              </p>
            ) : (
              <CommandGroup heading="Adresses">
                {current.results.map((address) => (
                  <CommandItem
                    key={`${address.label}-${address.lat}-${address.lng}`}
                    value={address.label}
                    onSelect={() => choose(address)}
                    className="min-h-11"
                  >
                    <MapPin aria-hidden="true" />
                    {address.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>

      {selection && located && (
        <div
          className="rounded-md border bg-white p-3 text-sm"
          aria-live="polite"
          data-testid="address-result"
        >
          <p className="mb-2 flex items-start gap-2 font-medium text-gray-900">
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {selection.label}
          </p>
          {located.containing.length > 0 ? (
            <ul className="space-y-1">
              {located.containing.map((feature) => (
                <li key={feature.properties.id}>
                  Dans le territoire <TerritorySummary feature={feature} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">
              Cette adresse n&apos;est dans aucun territoire
              {located.nearby.length === 0 && " ni à proximité"}.
            </p>
          )}
          {located.nearby.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-600">
                {located.containing.length > 0
                  ? "Juste à côté : "
                  : "Le plus proche : "}
              </p>
              <ul className="space-y-1">
                {located.nearby.map(({ feature, distance }) => (
                  <li key={feature.properties.id}>
                    <TerritorySummary feature={feature} />{" "}
                    <span className="text-gray-500">
                      à {formatDistance(distance)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
