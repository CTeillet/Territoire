"use client";

import React from "react";
import { SearchInput } from "@/components/shared/search-input";

/** Champ de recherche des territoires, avec un bouton pour l'effacer. */
export function TerritorySearchInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder="Rechercher un territoire, une ville, une personne…"
      label="Rechercher un territoire"
      className={className}
    />
  );
}
