import { useCallback, useEffect, useState } from "react";
import {
  getLabelPrinter,
  isAutoPrintEnabled,
  isLabelPrintingSupported,
  setAutoPrintEnabled,
} from "@/lib/label-printer";
import { isIOSDevice } from "@/lib/device";
import {
  isNativeLabelPrintingEnabled,
  setNativeLabelPrintingEnabled,
} from "@/lib/iphone-label-printer";

export interface LabelPrinterState {
  /** Le navigateur sait piloter l'imprimante (Web Serial). */
  supported: boolean;
  /** Une imprimante est choisie sur cet appareil. */
  connected: boolean;
  /** Étiquette imprimée à chaque attribution faite depuis cet appareil. */
  autoPrint: boolean;
  /** iPhone ou iPad. */
  ios: boolean;
  /** Impression confiée à l'app iOS TMS Impression installée et signée. */
  native: boolean;
  /** iPhone ou iPad avec le parcours fichier LBX choisi. */
  lbx: boolean;
}

const UNKNOWN: LabelPrinterState = {
  supported: false,
  connected: false,
  autoPrint: false,
  ios: false,
  native: false,
  lbx: false,
};

async function readState(): Promise<LabelPrinterState> {
  const ios = isIOSDevice();
  const native = ios && isNativeLabelPrintingEnabled();
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
    ios,
    native,
    lbx: ios && !native,
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

  const setNativePrint = useCallback((enabled: boolean) => {
    const native = setNativeLabelPrintingEnabled(enabled);
    setState((previous) => ({
      ...previous,
      native: previous.ios && native,
      lbx: previous.ios && !native,
    }));
  }, []);

  return { ...state, refresh, setAutoPrint, setNativePrint };
}
