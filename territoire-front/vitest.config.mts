import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  // Les tests n'ont pas besoin de Tailwind : PostCSS désactivé (les imports CSS, ex. Leaflet, restent possibles)
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "v8",
      // Compte aussi les fichiers non importés par les tests (sinon la couverture affichée est surévaluée)
      include: ["{app,components,hooks,lib,store,utils}/**/*.{ts,tsx}"],
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "components/ui/**",
        "node_modules/**",
        "coverage/**",
        ".next/**",
        "scripts/**",
        "**/*.d.ts",
        "**/*.config.*",
        "vitest.setup.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
