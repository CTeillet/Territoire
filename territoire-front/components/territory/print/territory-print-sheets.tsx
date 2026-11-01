import React from "react";
import { cn } from "@/lib/utils";
import { CARDS_PER_SHEET, chunk, MapState } from "@/lib/territory-print";

export interface PrintCard {
  id: string;
  name: string;
  map: MapState;
}

interface TerritoryPrintSheetsProps {
  cards: PrintCard[];
  className?: string;
}

/**
 * Feuilles A4 paysage de 4 cartes (2 × 2), séparées par des pointillés de découpe.
 * À l'écran, chaque feuille prend la largeur disponible ; à l'impression, elle fait 297 × 210 mm
 * (209 mm : un arrondi à 210 ajoute parfois une page blanche).
 */
export function TerritoryPrintSheets({
  cards,
  className,
}: TerritoryPrintSheetsProps) {
  return chunk(cards, CARDS_PER_SHEET).map((sheetCards, sheetIndex) => (
    <section
      key={sheetIndex}
      aria-label={`Feuille ${sheetIndex + 1}`}
      className={cn(
        "grid aspect-[297/210] w-full grid-cols-2 grid-rows-2 bg-white",
        "print:aspect-auto print:h-[209mm] print:w-[297mm] print:break-after-page print:last:break-after-auto",
        className
      )}
    >
      {Array.from({ length: CARDS_PER_SHEET }, (_, index) => (
        <div
          key={index}
          className={cn(
            // 4 % de la largeur d'un quart de feuille : environ 6 mm, hors des marges non imprimables
            "flex min-h-0 min-w-0 items-center justify-center border-dashed border-gray-400 p-[4%]",
            index % 2 === 0 && "border-r",
            index < 2 && "border-b"
          )}
        >
          {sheetCards[index] && <PrintCardContent card={sheetCards[index]} />}
        </div>
      ))}
    </section>
  ));
}

function PrintCardContent({ card }: { card: PrintCard }) {
  if (card.map.status === "ready") {
    // Image chargée par authFetch puis servie en blob: : rien à optimiser pour next/image.
    // <img> applique l'orientation EXIF (cartes numérisées de travers) ; object-contain l'agrandit sans la déformer.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={card.map.url}
        alt={`Carte ${card.name}`}
        className="h-full w-full object-contain"
      />
    );
  }
  return (
    <div className="text-center text-gray-500">
      <p className="font-semibold text-gray-700">{card.name}</p>
      <p className="text-sm">
        {card.map.status === "loading"
          ? "Chargement de la carte…"
          : "Carte indisponible"}
      </p>
    </div>
  );
}
