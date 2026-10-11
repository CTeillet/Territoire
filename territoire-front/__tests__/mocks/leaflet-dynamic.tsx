import React from "react";
import { vi } from "vitest";

/** Couche Leaflet factice : enregistre le popup et les gestionnaires d'événements. */
export type FakeLayer = {
  popup?: HTMLElement | string;
  handlers: Record<string, (event: unknown) => void>;
  bindPopup: (content: HTMLElement | string) => void;
  on: (event: string, handler: (event: unknown) => void) => void;
  remove: () => void;
};

export const layers: FakeLayer[] = [];

export function fakeLayer(): FakeLayer {
  const layer: FakeLayer = {
    handlers: {},
    bindPopup: (content) => {
      layer.popup = content;
    },
    on: (event, handler) => {
      layer.handlers[event] = handler;
    },
    remove: vi.fn(),
  };
  layers.push(layer);
  return layer;
}

type LeafletProps = {
  children?: React.ReactNode;
  data?: { features?: unknown[] };
  style?: unknown;
  onEachFeature?: (feature: unknown, layer: FakeLayer) => void;
  center?: unknown;
  bounds?: unknown;
  whenReady?: (event: unknown) => void;
};

/** Chargeurs passés à dynamic(), pour vérifier qu'ils résolvent bien un composant. */
export const loaders: Array<() => Promise<unknown>> = [];

/**
 * Remplace next/dynamic (utilisé pour charger react-leaflet côté client) : chaque composant dynamique devient un
 * conteneur qui applique `style` et `onEachFeature` à chaque entité GeoJSON reçue, comme le ferait Leaflet.
 */
export default function dynamic(loader?: () => Promise<unknown>) {
  if (loader) loaders.push(loader);
  return function DynamicLeaflet(props: LeafletProps) {
    const features = props.data?.features ?? [];
    const styles =
      typeof props.style === "function"
        ? features.map((f) => (props.style as (f: unknown) => unknown)(f))
        : props.style;
    features.forEach((feature) => props.onEachFeature?.(feature, fakeLayer()));
    return (
      <div
        data-testid="leaflet"
        data-features={features.length}
        data-styles={JSON.stringify(styles ?? null)}
        data-center={JSON.stringify(props.center ?? null)}
      >
        {props.children}
      </div>
    );
  };
}
