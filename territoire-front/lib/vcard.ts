import { parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import { Person } from "@/models/person";

/** Contact lu dans un fichier vCard (.vcf), prêt à devenir une personne. */
export interface VCardContact {
  firstName: string;
  lastName: string;
  email?: string;
  /** Au format international (E.164), comme le champ Téléphone : WhatsApp en a besoin. */
  phoneNumber?: string;
  /** Numéro présent dans la fiche mais non reconnu : il n'est pas importé. */
  invalidPhone?: string;
}

interface Property {
  name: string;
  /** Types de la propriété (CELL, HOME, PREF…), en majuscules. */
  types: Set<string>;
  value: string;
}

/**
 * Lit un fichier vCard (export de l'app Contacts de l'iPhone, d'iCloud ou d'Android)
 * et renvoie un contact par fiche, même incomplète : l'appelant décide quoi en faire.
 */
export function parseVCards(text: string): VCardContact[] {
  const contacts: VCardContact[] = [];
  let card: Property[] | null = null;

  for (const line of unfold(text)) {
    if (/^BEGIN:VCARD$/i.test(line)) {
      card = [];
    } else if (/^END:VCARD$/i.test(line)) {
      if (card) contacts.push(toContact(card));
      card = null;
    } else if (card) {
      const property = parseProperty(line);
      if (property) card.push(property);
    }
  }
  return contacts;
}

/** Normalise un numéro au format E.164 (numéros sans indicatif considérés français). */
export function normalizePhone(raw: string): string | undefined {
  const phone = parsePhoneNumber(raw, "FR");
  return phone?.isValid() ? phone.number : undefined;
}

const nameKey = (firstName: string, lastName: string) =>
  `${firstName} ${lastName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-\s]+/g, " ")
    .trim()
    .toLowerCase();

/** Numéro du fichier à reporter sur une personne de l'application. */
export interface PhoneProposal {
  person: Person;
  /** Au format international (E.164). */
  phoneNumber: string;
  /** Plusieurs numéros pour ce nom dans le fichier, ou homonymes dans l'application : à vérifier. */
  ambiguous: boolean;
  /**
   * Même numéro, mais enregistré sans indicatif (« 06… ») : réécrit au format international,
   * sans lequel l'envoi WhatsApp échoue (le serveur retire seulement le « + »).
   */
  reformat: boolean;
}

export interface PhoneMatching {
  /** Personnes sans numéro, dont le numéro diffère de celui du fichier ou reste à mettre au format international. */
  proposals: PhoneProposal[];
  /** Personnes dont le numéro est déjà celui du fichier, au format international. */
  upToDate: number;
  /** Contacts avec un numéro qui ne correspondent à aucune personne (ignorés). */
  unmatchedContacts: number;
  /** Personnes sans numéro que le fichier ne permet pas de compléter. */
  stillMissing: Person[];
}

/**
 * Rapproche les contacts du fichier des personnes de l'application par le nom
 * (accents, casse, tirets et ordre prénom/nom ignorés). Aucune personne n'est créée :
 * les contacts sans correspondance sont seulement comptés.
 */
export function matchPhones(
  persons: Person[],
  contacts: VCardContact[]
): PhoneMatching {
  const contactsByName = new Map<string, VCardContact[]>();
  for (const contact of contacts.filter((c) => c.phoneNumber)) {
    const keys = new Set([
      nameKey(contact.firstName, contact.lastName),
      nameKey(contact.lastName, contact.firstName),
    ]);
    keys.forEach((key) =>
      contactsByName.set(key, [...(contactsByName.get(key) ?? []), contact])
    );
  }
  const personsByName = new Map<string, number>();
  persons.forEach((person) => {
    const key = nameKey(person.firstName, person.lastName);
    personsByName.set(key, (personsByName.get(key) ?? 0) + 1);
  });

  const matched = new Set<VCardContact>();
  const result: PhoneMatching = {
    proposals: [],
    upToDate: 0,
    unmatchedContacts: 0,
    stillMissing: [],
  };
  for (const person of persons) {
    const key = nameKey(person.firstName, person.lastName);
    const found = contactsByName.get(key) ?? [];
    found.forEach((contact) => matched.add(contact));
    const phones = [...new Set(found.map((c) => c.phoneNumber!))];
    const current = person.phoneNumber?.trim();
    const normalized = current ? normalizePhone(current) : undefined;

    if (phones.length === 0) {
      if (!current) result.stillMissing.push(person);
    } else if (normalized && phones.includes(normalized)) {
      // Le numéro de la personne figure dans le fichier : seul son format peut changer
      if (normalized === person.phoneNumber) result.upToDate++;
      else
        result.proposals.push({
          person,
          phoneNumber: normalized,
          ambiguous: false,
          reformat: true,
        });
    } else {
      result.proposals.push({
        person,
        phoneNumber: phones[0],
        ambiguous: phones.length > 1 || personsByName.get(key)! > 1,
        reformat: false,
      });
    }
  }
  result.unmatchedContacts = contacts.filter(
    (c) => c.phoneNumber && !matched.has(c)
  ).length;
  return result;
}

/**
 * Recolle les lignes repliées : une ligne qui commence par une espace prolonge la précédente,
 * ainsi qu'une ligne quoted-printable (vCard 2.1) terminée par « = ».
 */
function unfold(text: string): string[] {
  const lines: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const last = lines.length - 1;
    if (last >= 0 && /^[ \t]/.test(line)) {
      lines[last] += line.slice(1);
    } else if (
      last >= 0 &&
      lines[last].endsWith("=") &&
      /QUOTED-PRINTABLE/i.test(lines[last].split(":")[0])
    ) {
      lines[last] = lines[last].slice(0, -1) + line;
    } else if (line.trim()) {
      lines.push(line);
    }
  }
  return lines;
}

/** « groupe.NOM;PARAM=X;PARAM=Y:valeur » ; le « : » peut figurer dans un paramètre entre guillemets. */
function parseProperty(line: string): Property | null {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length && colon < 0; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) colon = i;
  }
  if (colon < 0) return null;

  const [name, ...params] = line.slice(0, colon).split(";");
  const types = new Set<string>();
  let quotedPrintable = false;
  for (const param of params) {
    const [key, values] = param.includes("=")
      ? [
          param.slice(0, param.indexOf("=")),
          param.slice(param.indexOf("=") + 1),
        ]
      : ["TYPE", param]; // vCard 2.1 : « TEL;CELL:… »
    const upperKey = key.trim().toUpperCase();
    if (upperKey === "TYPE") {
      values
        .replace(/"/g, "")
        .split(",")
        .forEach((type) => types.add(type.trim().toUpperCase()));
    } else if (upperKey === "PREF") {
      types.add("PREF");
    } else if (upperKey === "ENCODING") {
      quotedPrintable = /QUOTED-PRINTABLE/i.test(values);
    }
  }
  if (types.has("QUOTED-PRINTABLE")) quotedPrintable = true;

  const value = line.slice(colon + 1);
  return {
    name: name.slice(name.lastIndexOf(".") + 1).toUpperCase(),
    types,
    value: quotedPrintable ? decodeQuotedPrintable(value) : value,
  };
}

function decodeQuotedPrintable(value: string): string {
  const encoder = new TextEncoder();
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const hex = value.slice(i + 1, i + 3);
    if (value[i] === "=" && /^[0-9A-F]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...encoder.encode(value[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Découpe une valeur composée (N) sur les « ; » non échappés. */
const splitComponents = (value: string) => value.split(/(?<!\\);/);

const unescape = (value: string) =>
  value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();

/** Les numéros de mobile d'abord (WhatsApp), puis le préféré, puis l'ordre de la fiche. */
const byPreference = (properties: Property[]) =>
  [...properties].sort(
    (a, b) =>
      Number(b.types.has("CELL")) * 2 +
      Number(b.types.has("PREF")) -
      (Number(a.types.has("CELL")) * 2 + Number(a.types.has("PREF")))
  );

const emailSchema = z.email();

function toContact(card: Property[]): VCardContact {
  const values = (name: string) => card.filter((p) => p.name === name);

  const [lastName = "", given = "", additional = ""] = splitComponents(
    values("N")[0]?.value ?? ""
  ).map(unescape);
  let firstName = [given, additional].filter(Boolean).join(" ");
  let familyName = lastName;
  // Sans nom structuré, le nom affiché : premier mot = prénom, la suite = nom
  if (!firstName && !familyName) {
    const [first = "", ...rest] = unescape(values("FN")[0]?.value ?? "").split(
      /\s+/
    );
    firstName = first;
    familyName = rest.join(" ");
  }

  const phones = byPreference(values("TEL")).map((p) =>
    unescape(p.value).replace(/^tel:/i, "")
  );
  const phoneNumber = phones.map(normalizePhone).find(Boolean);
  const email = byPreference(values("EMAIL"))
    .map((p) => unescape(p.value))
    .find((value) => emailSchema.safeParse(value).success);

  return {
    firstName,
    lastName: familyName,
    ...(email && { email }),
    ...(phoneNumber && { phoneNumber }),
    ...(!phoneNumber && phones[0] && { invalidPhone: phones[0] }),
  };
}
