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
  /** Safari sur iPhone : impression confiée à l'app iOS par un lien tmsprint. */
  native: boolean;
  /** iPhone ou iPad avec le parcours fichier LBX choisi. */
  lbx: boolean;
}

const UNKNOWN: LabelPrinterState = {
  supported: false,
  connected: false,
  autoPrint: false,
  ios: false,
  app: false,
  native: false,
  lbx: false,
};

async function readState(): Promise<LabelPrinterState> {
  const ios = isIOSDevice();
  const app = isNativeApp();
  const native = ios && !app && isNativeLabelPrintingEnabled();
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
    native,
    lbx: ios && !app && !native,
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
      native: previous.ios && !previous.app && native,
      lbx: previous.ios && !previous.app && !native,
    }));
  }, []);

  return { ...state, refresh, setAutoPrint, setNativePrint };
}
