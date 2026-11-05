import { afterEach, describe, expect, it, vi } from "vitest";
import type { Feature, Polygon } from "geojson";
import {
  GEOCODING_URL,
  searchAddresses,
  territoriesAtPoint,
} from "@/lib/address-search";

const geocoding = (features: unknown[]) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ type: "FeatureCollection", features }),
  }) as Response;

const address = (label: string, lng: number, lat: number) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { label, score: 0.9, type: "housenumber" },
});

describe("searchAddresses", () => {
  afterEach(() => vi.restoreAllMocks());

  it("interroge la Géoplateforme près des territoires et lit les adresses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geocoding([
        address("12 Rue Victor Hugo 91550 Paray-Vieille-Poste", 2.36, 48.71),
        // Réponses inexploitables : ignorées
        { type: "Feature", geometry: null, properties: { label: "x" } },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: ["a", "b"] },
          properties: { label: "y" },
        },
        address(42 as unknown as string, 2, 48),
      ])
    );

    const results = await searchAddresses(" 12 rue victor hugo ", {
      lat: 48.7012345,
      lng: 2.3654321,
    });

    expect(results).toEqual([
      {
        label: "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
        lng: 2.36,
        lat: 48.71,
      },
    ]);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe(GEOCODING_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "12 rue victor hugo",
      index: "address",
      limit: "5",
      lat: "48.70123",
      lon: "2.36543",
    });
    // Aucun cookie de TMS n'est envoyé à l'IGN
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ credentials: "omit" })
    );
  });

  it("lit le détail de l'adresse quand le service le donne", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geocoding([
        {
          ...address(
            "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
            2.36,
            48.71
          ),
          properties: {
            label: "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
            housenumber: "12",
            street: "Rue Victor Hugo",
            postcode: "91550",
            city: "Paray-Vieille-Poste",
            // Valeurs inexploitables : ignorées
            citycode: 91479,
          },
        },
        {
          ...address("Rue Victor Hugo 91550 Paray-Vieille-Poste", 2.36, 48.71),
          properties: {
            label: "Rue Victor Hugo 91550 Paray-Vieille-Poste",
            housenumber: "",
            street: "Rue Victor Hugo",
            postcode: 91550,
          },
        },
      ])
    );

    expect(await searchAddresses("12 rue victor hugo")).toEqual([
      {
        label: "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
        lng: 2.36,
        lat: 48.71,
        housenumber: "12",
        street: "Rue Victor Hugo",
        postcode: "91550",
        city: "Paray-Vieille-Poste",
      },
      {
        label: "Rue Victor Hugo 91550 Paray-Vieille-Poste",
        lng: 2.36,
        lat: 48.71,
        street: "Rue Victor Hugo",
      },
    ]);
  });

  it("n'interroge pas le service pour moins de 3 caractères", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await searchAddresses("12")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signale une panne du réseau ou du service", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );
    await expect(searchAddresses("rue victor hugo")).rejects.toThrow(
      "Recherche d'adresse impossible : vérifiez votre réseau"
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);
    await expect(searchAddresses("rue victor hugo")).rejects.toThrow(
      "Le service d'adresses ne répond pas, réessayez plus tard"
    );
  });

  it("laisse passer l'annulation d'une recherche dépassée", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abort);
    await expect(searchAddresses("rue victor hugo")).rejects.toBe(abort);
  });
});

describe("territoriesAtPoint", () => {
  // Carrés de 0,002° (environ 150 m × 220 m) côte à côte, séparés d'environ 15 m
  const square = (id: string, lng: number, lat: number): Feature<Polygon> => ({
    type: "Feature",
    properties: { id },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng, lat],
          [lng + 0.002, lat],
          [lng + 0.002, lat + 0.002],
          [lng, lat + 0.002],
          [lng, lat],
        ],
      ],
    },
  });
  const a = square("a", 2.36, 48.7);
  const b = square("b", 2.3622, 48.7);
  const far = square("far", 2.4, 48.7);
  const empty: Feature<Polygon> = {
    type: "Feature",
    properties: { id: "vide" },
    geometry: null as unknown as Polygon,
  };
  const ids = (features: Feature[]) =>
    features.map((f) => (f.properties as { id: string }).id);

  it("trouve le territoire qui contient l'adresse, et celui d'en face", () => {
    const { containing, nearby } = territoriesAtPoint(
      { lat: 48.701, lng: 2.3619 },
      [a, b, far, empty]
    );
    expect(ids(containing)).toEqual(["a"]);
    expect(ids(nearby.map((n) => n.feature))).toEqual(["b"]);
    expect(nearby[0].distance).toBeLessThan(60);
  });

  it("propose les plus proches, du plus près au plus loin, quand l'adresse n'est dans aucun", () => {
    const { containing, nearby } = territoriesAtPoint(
      { lat: 48.701, lng: 2.3655 },
      [a, b, far]
    );
    expect(containing).toEqual([]);
    expect(ids(nearby.map((n) => n.feature))).toEqual(["b", "a"]);
    expect(nearby[0].distance).toBeLessThan(nearby[1].distance);
  });

  it("ne propose rien au-delà de 500 m", () => {
    const { containing, nearby } = territoriesAtPoint(
      { lat: 48.75, lng: 2.3 },
      [a, b]
    );
    expect(containing).toEqual([]);
    expect(nearby).toEqual([]);
  });
});
