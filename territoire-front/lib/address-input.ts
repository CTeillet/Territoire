import { AddressNotToDoDto } from "@/models/AddressNotToDoDto";

/** Code postal et ville appliqués quand la saisie n'en précise pas (ceux de la ville du territoire). */
export type DefaultCity = { zipCode: string; name: string };

export type ParsedAddress =
  | { address: AddressNotToDoDto; error?: never }
  | { address?: never; error: string };

/** « 35000 Rennes » en fin de saisie, séparé de la rue par une virgule ou un espace. */
const CITY_SUFFIX = /^(.*?)[\s,]+(\d{5})\s+(.+)$/;
/** Numéro en tête, éventuellement suivi de bis, ter, quater ou d'une lettre : « 21 », « 21 bis », « 21B ». */
const NUMBER_PREFIX = /^(\d+(?:\s*(?:bis|ter|quater|[a-z])\b)?)[\s,]+(.+)$/i;

const clean = (value: string) => value.replace(/^[\s,]+|[\s,]+$/g, "");

/**
 * Découpe une adresse tapée d'un seul tenant (« 21 rue de la Paix », « 21 bis rue de la Paix, 35000 Rennes »)
 * en numéro, rue, code postal et ville. Sans code postal ni ville, ceux de `defaultCity` sont utilisés.
 */
export function parseAddress(
  text: string,
  defaultCity?: DefaultCity | null
): ParsedAddress {
  let rest = text.trim().replace(/\s+/g, " ");
  if (!rest) return { error: "Saisissez une adresse, ex. 21 rue de la Paix" };

  let zipCode = defaultCity?.zipCode ?? "";
  let city = defaultCity?.name ?? "";
  const withCity = rest.match(CITY_SUFFIX);
  if (withCity) {
    rest = withCity[1];
    zipCode = withCity[2];
    city = clean(withCity[3]);
  }

  const withNumber = rest.match(NUMBER_PREFIX);
  const street = withNumber ? clean(withNumber[2]) : "";
  if (!withNumber || !street) {
    return { error: "Commencez par le numéro, ex. 21 rue de la Paix" };
  }
  if (!zipCode || !city) {
    return {
      error:
        "Précisez le code postal et la ville, ex. 21 rue de la Paix, 35000 Rennes",
    };
  }
  return { address: { number: withNumber[1], street, zipCode, city } };
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Même adresse, sans tenir compte des majuscules, des accents ni de la ponctuation. */
export function sameAddress(a: AddressNotToDoDto, b: AddressNotToDoDto) {
  return (
    normalize(a.number) === normalize(b.number) &&
    normalize(a.street) === normalize(b.street) &&
    normalize(a.zipCode) === normalize(b.zipCode)
  );
}
