import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

// Règles de Next.js, de React (hooks) et de TypeScript sur les fichiers .js, .ts et .tsx
// (cf. node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md)
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // setState appelé dans un useEffect : 13 composants existants, à restructurer un par un
      // (état dérivé calculé au rendu, chargement déclenché par l'événement). Signalé sans bloquer la CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    "public/**",
  ]),
  eslintConfigPrettier,
]);

export default eslintConfig;
