import { describe, expect, it } from "vitest";
import { parseAddress, sameAddress } from "@/lib/address-input";

const RENNES = { zipCode: "35000", name: "Rennes" };

describe("parseAddress", () => {
  it.each([
    ["21 rue de la Paix", "21", "rue de la Paix"],
    ["  21   rue  de la Paix  ", "21", "rue de la Paix"],
    ["21, rue de la Paix", "21", "rue de la Paix"],
    ["21 bis rue de la Paix", "21 bis", "rue de la Paix"],
    ["21ter avenue Foch", "21ter", "avenue Foch"],
    ["21B allée des Pins", "21B", "allée des Pins"],
    ["3 avenue du 8 Mai 1945", "3", "avenue du 8 Mai 1945"],
  ])("découpe « %s » dans la ville par défaut", (text, number, street) => {
    expect(parseAddress(text, RENNES)).toEqual({
      address: { number, street, zipCode: "35000", city: "Rennes" },
    });
  });

  it.each([
    "4 place du Marché, 35510 Cesson-Sévigné",
    "4 place du Marché 35510 Cesson-Sévigné",
  ])("garde le code postal et la ville tapés : « %s »", (text) => {
    expect(parseAddress(text, RENNES)).toEqual({
      address: {
        number: "4",
        street: "place du Marché",
        zipCode: "35510",
        city: "Cesson-Sévigné",
      },
    });
  });

  it("se passe de ville par défaut quand la saisie en donne une", () => {
    expect(parseAddress("4 place du Marché, 35510 Cesson", null)).toEqual({
      address: {
        number: "4",
        street: "place du Marché",
        zipCode: "35510",
        city: "Cesson",
      },
    });
  });

  it.each([
    ["", "Saisissez une adresse, ex. 21 rue de la Paix"],
    ["   ", "Saisissez une adresse, ex. 21 rue de la Paix"],
    ["rue de la Paix", "Commencez par le numéro, ex. 21 rue de la Paix"],
    ["21", "Commencez par le numéro, ex. 21 rue de la Paix"],
    ["21, 35000 Rennes", "Commencez par le numéro, ex. 21 rue de la Paix"],
  ])("refuse « %s »", (text, error) => {
    expect(parseAddress(text, RENNES)).toEqual({ error });
  });

  it("demande la ville sans ville par défaut", () => {
    expect(parseAddress("21 rue de la Paix")).toEqual({
      error:
        "Précisez le code postal et la ville, ex. 21 rue de la Paix, 35000 Rennes",
    });
  });
});

describe("sameAddress", () => {
  const address = {
    number: "12",
    street: "rue des Lilas",
    zipCode: "35000",
    city: "Rennes",
  };

  it("ignore les majuscules, les accents et la ponctuation", () => {
    expect(
      sameAddress(address, {
        ...address,
        street: "Rue  des Lilas.",
        city: "RENNES",
      })
    ).toBe(true);
    expect(
      sameAddress(
        { ...address, street: "allée Hélène" },
        { ...address, street: "Allee helene" }
      )
    ).toBe(true);
  });

  it("distingue le numéro, la rue et le code postal", () => {
    expect(sameAddress(address, { ...address, number: "14" })).toBe(false);
    expect(sameAddress(address, { ...address, street: "rue des Roses" })).toBe(
      false
    );
    expect(sameAddress(address, { ...address, zipCode: "35200" })).toBe(false);
  });
});
