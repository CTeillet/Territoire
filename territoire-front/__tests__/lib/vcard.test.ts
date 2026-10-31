import { describe, it, expect } from "vitest";
import { matchPhones, normalizePhone, parseVCards } from "@/lib/vcard";

const card = (...lines: string[]) =>
  ["BEGIN:VCARD", ...lines, "END:VCARD"].join("\r\n");

describe("parseVCards", () => {
  it("lit un export de l'iPhone : nom structuré, mobile préféré, e-mail", () => {
    const text = card(
      "VERSION:3.0",
      "PRODID:-//Apple Inc.//iPhone OS 18.0//EN",
      "N:Bernard;Lucie;;;",
      "FN:Lucie Bernard",
      "TEL;type=HOME;type=VOICE;type=pref:02 99 12 34 56",
      "TEL;type=CELL;type=VOICE:06 12 34 56 78",
      "item1.EMAIL;type=INTERNET;type=pref:lucie@exemple.fr",
      "item1.X-ABLabel:_$!<Other>!$_",
      "PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD",
      " /2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8Q"
    );

    expect(parseVCards(text)).toEqual([
      {
        firstName: "Lucie",
        lastName: "Bernard",
        email: "lucie@exemple.fr",
        phoneNumber: "+33612345678",
      },
    ]);
  });

  it("lit plusieurs fiches, les lignes repliées et les caractères échappés", () => {
    const text = [
      card("VERSION:3.0", "N:Dupont\\, junior;Jean;Pierre;;", "FN:Jean Dupont"),
      card("VERSION:3.0", "N:Le Gall;Hé", " loïse;;;", "TEL:+44 7911 123456"),
    ].join("\n");

    expect(parseVCards(text)).toEqual([
      { firstName: "Jean Pierre", lastName: "Dupont, junior" },
      {
        firstName: "Héloïse",
        lastName: "Le Gall",
        phoneNumber: "+447911123456",
      },
    ]);
  });

  it("décode le quoted-printable des exports Android (vCard 2.1)", () => {
    const text = card(
      "VERSION:2.1",
      "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Le=20Gall;H=C3=A9l=",
      "=C3=A8ne;;;",
      "TEL;CELL;PREF:06 12 34 56 78"
    );

    expect(parseVCards(text)).toEqual([
      { firstName: "Hélène", lastName: "Le Gall", phoneNumber: "+33612345678" },
    ]);
  });

  it("lit les numéros au format URI (vCard 4)", () => {
    const text = card(
      "VERSION:4.0",
      "N:Petit;Marc;;;",
      'TEL;VALUE=uri;TYPE="cell,voice":tel:+33-6-12-34-56-78'
    );

    expect(parseVCards(text)[0].phoneNumber).toBe("+33612345678");
  });

  it("se rabat sur le nom affiché et signale un numéro non reconnu", () => {
    const text = [
      card("VERSION:3.0", "N:;;;;", "FN:Jean de la Fontaine", "TEL:12"),
      card("VERSION:3.0", "N:;Maman;;;", "EMAIL:pas-un-email"),
    ].join("\n");

    expect(parseVCards(text)).toEqual([
      { firstName: "Jean", lastName: "de la Fontaine", invalidPhone: "12" },
      { firstName: "Maman", lastName: "" },
    ]);
  });

  it("ne trouve rien dans un fichier qui n'est pas une vCard", () => {
    expect(parseVCards("nom;prénom\nDupont;Jean")).toEqual([]);
  });
});

describe("normalizePhone", () => {
  it("met les numéros au format international, français par défaut", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("0033 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("12")).toBeUndefined();
  });
});

describe("matchPhones", () => {
  const persons = [
    { id: "p1", firstName: "Hélène", lastName: "Le-Gall" },
    {
      id: "p2",
      firstName: "Jean",
      lastName: "Dupont",
      phoneNumber: "0612345678",
    },
    {
      id: "p3",
      firstName: "Anne",
      lastName: "Martin",
      phoneNumber: "+33600000000",
    },
    { id: "p4", firstName: "Paul", lastName: "Durand" },
    { id: "p5", firstName: "Luc", lastName: "Morel" },
    { id: "p6", firstName: "Luc", lastName: "Morel" },
    {
      id: "p7",
      firstName: "Marc",
      lastName: "Petit",
      phoneNumber: "+33688888888",
    },
  ];

  const summary = (result: ReturnType<typeof matchPhones>) =>
    result.proposals.map((p) => [
      p.person.id,
      p.phoneNumber,
      p.ambiguous,
      p.reformat,
    ]);

  it("propose les numéros des personnes existantes, sans en créer", () => {
    const result = matchPhones(persons, [
      // Accents, casse, tiret et ordre prénom/nom ignorés
      { firstName: "Le Gall", lastName: "helene", phoneNumber: "+33611111111" },
      // Même numéro, enregistré sans indicatif dans l'application
      { firstName: "Jean", lastName: "Dupont", phoneNumber: "+33612345678" },
      { firstName: "Anne", lastName: "Martin", phoneNumber: "+33622222222" },
      { firstName: "Luc", lastName: "Morel", phoneNumber: "+33633333333" },
      { firstName: "Marc", lastName: "Petit", phoneNumber: "+33688888888" },
      {
        firstName: "Inconnu",
        lastName: "Contact",
        phoneNumber: "+33644444444",
      },
      { firstName: "Paul", lastName: "Durand", invalidPhone: "12" },
    ]);

    expect(summary(result)).toEqual([
      ["p1", "+33611111111", false, false],
      // Mise au format international, sans changer de numéro
      ["p2", "+33612345678", false, true],
      ["p3", "+33622222222", false, false],
      // Homonymes dans l'application : à vérifier
      ["p5", "+33633333333", true, false],
      ["p6", "+33633333333", true, false],
    ]);
    expect(result.upToDate).toBe(1);
    expect(result.unmatchedContacts).toBe(1);
    expect(result.stillMissing.map((p) => p.id)).toEqual(["p4"]);
  });

  it("signale plusieurs numéros pour un même nom, sauf si l'actuel en fait partie", () => {
    const contacts = [
      { firstName: "Paul", lastName: "Durand", phoneNumber: "+33655555555" },
      { firstName: "Paul", lastName: "Durand", phoneNumber: "+33666666666" },
      { firstName: "Jean", lastName: "Dupont", phoneNumber: "+33677777777" },
      { firstName: "Jean", lastName: "Dupont", phoneNumber: "+33612345678" },
      { firstName: "Marc", lastName: "Petit", phoneNumber: "+33699999999" },
      { firstName: "Marc", lastName: "Petit", phoneNumber: "+33688888888" },
    ];

    expect(summary(matchPhones(persons, contacts))).toEqual([
      ["p2", "+33612345678", false, true],
      ["p4", "+33655555555", true, false],
    ]);
    expect(matchPhones(persons, contacts).upToDate).toBe(1);
  });
});
