import { useEffect, useRef, useState } from "react";
import { createPrintableMapLoader, MapState } from "@/lib/territory-print";

type PrintableMapLoader = ReturnType<typeof createPrintableMapLoader>;

/**
 * Cartes des territoires à imprimer, chargées à mesure de la sélection et libérées en quittant la page.
 * Un territoire absent du résultat est encore en cours de chargement.
 */
export function usePrintableMaps(
  territoryIds: string[]
): Record<string, MapState> {
  const [maps, setMaps] = useState<Record<string, MapState>>({});
  const loader = useRef<PrintableMapLoader | null>(null);

  // Un chargeur par montage : en mode strict, le premier est abandonné (et ses images libérées)
  useEffect(() => {
    const current = createPrintableMapLoader((territoryId, state) =>
      setMaps((previous) => ({ ...previous, [territoryId]: state }))
    );
    loader.current = current;
    return () => current.dispose();
  }, []);

  useEffect(() => {
    loader.current?.want(territoryIds);
  }, [territoryIds]);

  return maps;
}
