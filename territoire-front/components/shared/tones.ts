/**
 * Tons de l'application, les mêmes partout (badges, encadrés, chiffres, pastilles) : seule source des couleurs vives,
 * le reste passe par les couleurs du thème (text-muted-foreground, bg-muted, border, text-destructive...).
 * Vert : en cours ou fait ; bleu : en attente, information ; ambre : à surveiller ; rouge : bloquant ; gris : sans objet.
 */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Badge : fond pâle et texte foncé, lisibles (contraste AA). */
export const toneBadge: Record<Tone, string> = {
  neutral: "border-gray-200 bg-gray-100 text-gray-700",
  info: "border-sky-200 bg-sky-100 text-sky-800",
  success: "border-green-200 bg-green-100 text-green-800",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
  danger: "border-red-200 bg-red-100 text-red-800",
};

/** Encadré (cf. Notice) : bordure, fond très pâle et texte foncé. */
export const toneSurface: Record<Tone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

/** Texte coloré (chiffre clé, message court sous un champ). */
export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-sky-700",
  success: "text-green-700",
  warning: "text-amber-700",
  danger: "text-destructive",
};

/** Bordure d'un élément signalé (ex. carte d'un territoire perdu). */
export const toneBorder: Record<Tone, string> = {
  neutral: "border-gray-400",
  info: "border-sky-400",
  success: "border-green-400",
  warning: "border-amber-400",
  danger: "border-red-400",
};

/** Pastille de couleur (marqueur dans une liste). */
export const toneMark: Record<Tone, string> = {
  neutral: "bg-gray-400",
  info: "bg-sky-600",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

/** Lien dans un texte ou un tableau (nom d'un territoire, « voir plus »). */
export const textLink =
  "font-medium text-blue-700 underline-offset-4 hover:underline";
