import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
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
