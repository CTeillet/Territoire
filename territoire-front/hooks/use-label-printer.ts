import { useCallback, useEffect, useState } from "react";
import {
  getLabelPrinter,
  isAutoPrintEnabled,
  isLabelPrintingSupported,
  setAutoPrintEnabled,
} from "@/lib/label-printer";

export interface LabelPrinterState {
  /** Le navigateur sait piloter l'imprimante (Web Serial). */
  supported: boolean;
  /** Une imprimante est choisie sur cet appareil. */
  connected: boolean;
  /** Étiquette imprimée à chaque attribution faite depuis cet appareil. */
  autoPrint: boolean;
}

const UNKNOWN: LabelPrinterState = {
  supported: false,
  connected: false,
  autoPrint: false,
};

async function readState(): Promise<LabelPrinterState> {
  let connected = false;
  try {
    connected = (await getLabelPrinter()) !== null;
  } catch {
    // Web Serial refusé (politique de permissions) : comme sans imprimante
  }
  return {
    supported: isLabelPrintingSupported(),
    connected,
    autoPrint: isAutoPrintEnabled(),
  };
}

/** Imprimante d'étiquettes de cet appareil ; tout est faux pendant le rendu serveur et le premier chargement. */
export function useLabelPrinter() {
  const [state, setState] = useState(UNKNOWN);

  useEffect(() => {
    let cancelled = false;
    readState().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** À appeler après avoir choisi ou oublié l'imprimante. */
  const refresh = useCallback(async () => setState(await readState()), []);

  const setAutoPrint = useCallback((enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    setState((previous) => ({ ...previous, autoPrint: enabled }));
  }, []);

  return { ...state, refresh, setAutoPrint };
}
