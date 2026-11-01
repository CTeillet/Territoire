import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/** Faux pendant le rendu serveur et l'hydratation, vrai ensuite. */
export function useIsClient() {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  );
}
