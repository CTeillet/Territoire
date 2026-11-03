"use client";

import { useEffect, useRef, useState } from "react";
import { addMonths, format } from "date-fns";
import { Bluetooth, Printer, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLabelPrinter } from "@/hooks/use-label-printer";
import {
  connectLabelPrinter,
  forgetLabelPrinter,
  UNSUPPORTED_MESSAGE,
} from "@/lib/label-printer";
import {
  assignmentLabelText,
  printAssignmentLabel,
  renderLabel,
} from "@/lib/assignment-label";

// Hauteur imprimable d'un ruban de 12 mm, et ses marges non imprimées (85 points de large en tout)
const PREVIEW_HEIGHT = 64;
const PREVIEW_TAPE_HEIGHT = 85;

// Attribution fictive : étiquette de test et aperçu
const SAMPLE_ASSIGNMENT = {
  person: { id: null, firstName: "Jean", lastName: "Dupont" },
  dueDate: format(addMonths(new Date(), 4), "yyyy-MM-dd"),
};

/**
 * Imprimante d'étiquettes de cet appareil : choix de la P-touch appairée en Bluetooth, étiquette de test et
 * impression automatique à l'attribution.
 */
export function LabelPrinterSection({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { supported, connected, autoPrint, refresh, setAutoPrint } =
    useLabelPrinter();
  const [printing, setPrinting] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Aperçu au point près de ce qui sort sur un ruban de 12 mm
  useEffect(() => {
    const canvas = previewRef.current;
    const text = assignmentLabelText(SAMPLE_ASSIGNMENT);
    if (!canvas || !text) return;
    try {
      const bitmap = renderLabel(text, PREVIEW_HEIGHT);
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      const image = context.createImageData(bitmap.width, bitmap.height);
      bitmap.ink.forEach((dot, i) => {
        const value = dot ? 0 : 255;
        image.data.set([value, value, value, 255], i * 4);
      });
      context.putImageData(image, 0, 0);
    } catch {
      // Canvas indisponible : pas d'aperçu
    }
  }, []);

  const onConnect = async () => {
    try {
      await connectLabelPrinter();
      toast.success("Imprimante d'étiquettes choisie pour cet appareil");
    } catch (error) {
      // NotFoundError : fenêtre de choix fermée sans sélection
      if ((error as Error).name !== "NotFoundError") {
        toast.error((error as Error).message);
      }
    }
    await refresh();
  };

  const onForget = async () => {
    await forgetLabelPrinter();
    await refresh();
    toast.success("Cet appareil n'imprime plus d'étiquettes");
  };

  const onTestPrint = async () => {
    setPrinting(true);
    await printAssignmentLabel(SAMPLE_ASSIGNMENT);
    setPrinting(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && (
        <h2 className="text-lg font-semibold">Imprimante d&apos;étiquettes</h2>
      )}
      <p className="text-sm text-muted-foreground">
        Une Brother P-touch Cube reliée en Bluetooth imprime une étiquette à
        chaque attribution : prénom, initiale du nom et date de retour prévue.
        Le réglage est propre à chaque appareil (ordinateur, téléphone Android).
      </p>

      {!supported ? (
        <p className="text-sm text-orange-700">
          {UNSUPPORTED_MESSAGE} Les iPhone et iPad ne le permettent pas.
        </p>
      ) : (
        <>
          <p className="text-sm">
            {connected
              ? "Une imprimante est choisie sur cet appareil."
              : "Aucune imprimante sur cet appareil : appairez d'abord la P-touch dans les réglages Bluetooth, puis choisissez-la ici."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={connected ? "outline" : "default"}
              onClick={onConnect}
            >
              <Bluetooth className="h-4 w-4" />
              {connected ? "Changer d'imprimante" : "Choisir l'imprimante"}
            </Button>
            {connected && (
              <>
                <Button onClick={onTestPrint} disabled={printing}>
                  <Printer className="h-4 w-4" />
                  {printing
                    ? "Impression..."
                    : "Imprimer une étiquette de test"}
                </Button>
                <Button variant="outline" onClick={onForget}>
                  <Unplug className="h-4 w-4" />
                  Oublier l&apos;imprimante
                </Button>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={connected && autoPrint}
              disabled={!connected}
              onCheckedChange={(checked) => setAutoPrint(checked === true)}
            />
            Imprimer l&apos;étiquette à chaque attribution faite depuis cet
            appareil
          </label>
        </>
      )}

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Aperçu (ruban de 12 mm)</p>
        {/* Le ruban et ses marges non imprimées autour de l'étiquette, à l'échelle */}
        <div
          className="inline-block rounded-sm border bg-white"
          style={{
            paddingBlock: `calc(4.5rem * ${(PREVIEW_TAPE_HEIGHT - PREVIEW_HEIGHT) / 2 / PREVIEW_HEIGHT})`,
          }}
        >
          <canvas
            ref={previewRef}
            role="img"
            aria-label="Aperçu de l'étiquette"
            className="block h-[4.5rem] [image-rendering:pixelated]"
          />
        </div>
      </div>
    </div>
  );
}
