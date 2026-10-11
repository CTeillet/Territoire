import nextPlugin from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  nextPlugin.configs["core-web-vitals"],
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "out/**",
      "public/**",
    ],
  },
  eslintConfigPrettier,
];
