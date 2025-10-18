"use client";

import nunjucks from "nunjucks";

// Environnement Nunjucks pour le navigateur (pas de FileSystemLoader)
const env = new nunjucks.Environment(undefined, {
    autoescape: false, // on génère du texte pur (WhatsApp)
});

// // --- Filtres utiles (fr) ---
// const prFr = new Intl.PluralRules("fr-FR");
//
// /** {{ count | s }} -> '' si 1, 's' sinon */
// env.addFilter("s", (count: number) => (prFr.select(count) === "one" ? "" : "s"));
//
// /** {{ count | plur({ one: "article", other: "articles" }) }} */
// env.addFilter("plur", (count: number, forms: { one: string; other: string }) =>
//     prFr.select(count) === "one" ? forms.one : forms.other
// );
//
// // (Optionnel) joinEt: ["A","B","C"] -> "A, B et C"
// env.addFilter("joinEt", (arr?: string[]) => {
//     if (!arr || arr.length === 0) return "";
//     if (arr.length === 1) return arr[0];
//     return `${arr.slice(0, -1).join(", ")} et ${arr[arr.length - 1]}`;
// });

// Export simple
export function renderTemplate(template: string, data: unknown): string {
    return env.renderString(template, (data ?? {}) as Record<string, unknown>);
}