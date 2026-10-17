import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equals,
  filterFn_includesString,
  filterFn_weakEquals,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

// Fonctionnalités des tableaux de données : filtres, tri, pagination et colonnes masquées.
// En v9, le mode "auto" ne choisit que parmi les fonctions enregistrées : on déclare celles
// qu'il retient pour nos colonnes (texte, objet ou valeur vide), comme le faisait la v8.
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equals: filterFn_equals,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
