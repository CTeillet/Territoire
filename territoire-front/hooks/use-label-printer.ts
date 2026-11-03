import { useCallback, useEffect, useState } from "react";
import {
  getLabelPrinter,
  isAutoPrintEnabled,
  isLabelPrintingSupported,
  setAutoPrintEnabled,
} from "@/lib/label-printer";
import { isIOSDevice } from "@/lib/device";
import { isNativeApp } from "@/lib/native-app";

export interface LabelPrinterState {
  /** Cet appareil sait piloter l'imprimante (Web Serial ou app iOS TMS). */
  supported: boolean;
  /** Une imprimante est choisie sur cet appareil ; dans l'app iOS TMS, l'app s'en charge. */
  connected: boolean;
  /** Étiquette imprimée à chaque attribution faite depuis cet appareil. */
  autoPrint: boolean;
  /** iPhone ou iPad. */
  ios: boolean;
  /** Site affiché dans l'app iOS TMS, qui imprime elle-même. */
  app: boolean;
  /** iPhone ou iPad hors de l'app TMS (Safari) : l'étiquette est un fichier LBX. */
  lbx: boolean;
}

const UNKNOWN: LabelPrinterState = {
  supported: false,
  connected: false,
  autoPrint: false,
  ios: false,
  app: false,
  lbx: false,
};

async function readState(): Promise<LabelPrinterState> {
  const ios = isIOSDevice();
  const app = isNativeApp();
  let connected = false;
  try {
    connected = (await getLabelPrinter()) !== null;
  } catch {
    // Web Serial refusé (politique de permissions) : comme sans imprimante
  }
  return {
    supported: app || isLabelPrintingSupported(),
    connected: app || connected,
    autoPrint: isAutoPrintEnabled(),
    ios,
    app,
    lbx: ios && !app,
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
