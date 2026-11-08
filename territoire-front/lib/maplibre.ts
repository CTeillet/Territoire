/**
 * MapLibre prêt à l'emploi, à importer à la place de maplibre-gl. Depuis la v6 (ESM seul), MapLibre calcule
 * lui-même l'adresse de son worker à partir de import.meta.url ; Turbopack résout mal ce calcul (il le fait pointer
 * sur maplibre-gl-dev.mjs) et le plan reste vide. On lui donne donc l'adresse du worker, que Turbopack publie avec
 * les autres fichiers du build.
 */
import * as maplibregl from "maplibre-gl";

maplibregl.setWorkerUrl(
  new URL(
    "../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url
  ).href
);

export default maplibregl;
