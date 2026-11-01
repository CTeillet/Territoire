import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  chunk,
  cityName,
  compareNames,
  createPrintableMapLoader,
  findContentBounds,
  loadPrintableMap,
} from "@/lib/territory-print";
import { Territory } from "@/models/territory";
import { jsonResponse, mockApi, TEST_CITY } from "../test-utils";

/** Image RGBA blanche de width × height, avec les rectangles noirs donnés. */
function pixels(
  width: number,
  height: number,
  blocks: { x: number; y: number; width: number; height: number }[] = []
) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  blocks.forEach((block) => {
    for (let y = block.y; y < block.y + block.height; y++) {
      for (let x = block.x; x < block.x + block.width; x++) {
        data.set([0, 0, 0, 255], (y * width + x) * 4);
      }
    }
  });
  return data;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("territory-print", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("répartit les cartes par feuilles de 4", () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 4)).toEqual([
      [1, 2, 3, 4],
      [5, 6],
    ]);
    expect(chunk([], 4)).toEqual([]);
  });

  it("trie les noms dans l'ordre naturel et lit la ville sous ses deux formes", () => {
    expect(["PVP10", "pvp2", "PVP1"].sort(compareNames)).toEqual([
      "PVP1",
      "pvp2",
      "PVP10",
    ]);
    expect(cityName({ city: "Morangis" as unknown as Territory["city"] })).toBe(
      "Morangis"
    );
    expect(cityName({ city: TEST_CITY })).toBe("Rennes");
  });

  it("trouve la partie utile d'une image en ignorant le fond blanc, la transparence et les poussières", () => {
    const data = pixels(10, 8, [
      { x: 2, y: 3, width: 4, height: 2 },
      { x: 8, y: 0, width: 1, height: 1 }, // poussière isolée
    ]);
    expect(findContentBounds(data, 10, 8)).toEqual({
      x: 2,
      y: 3,
      width: 4,
      height: 2,
    });

    expect(findContentBounds(pixels(10, 8), 10, 8)).toBeNull();
    // Noir mais transparent : du fond
    expect(
      findContentBounds(new Uint8ClampedArray(10 * 8 * 4), 10, 8)
    ).toBeNull();
  });

  /** Image de width × height pixels, chargée dès que son src est renseigné. */
  const stubImage = (width: number, height: number) =>
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = width;
        naturalHeight = height;
        onload: (() => void) | null = null;
        set src(url: string) {
          if (url) setTimeout(() => this.onload?.());
        }
      }
    );

  /** Canvas dont la copie réduite est `reduced` ; toBlob renvoie l'image recadrée. */
  const stubCanvas = (reduced: Uint8ClampedArray) => {
    const context = {
      drawImage: vi.fn(),
      getImageData: () => ({ data: reduced }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    );
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) => callback(new Blob(["recadrée"])));
    return { context, toBlob };
  };

  it("charge une carte et en découpe la partie utile, sans les marges blanches", async () => {
    mockApi({ "GET /api/territoires/t1/carte": jsonResponse({}) });
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:carte")
      .mockReturnValueOnce("blob:recadree");
    stubImage(2000, 1000);
    // Copie réduite à 400 × 200 (échelle 0,2) : carte de (100, 50) à (299, 149)
    const { context } = stubCanvas(
      pixels(400, 200, [{ x: 100, y: 50, width: 200, height: 100 }])
    );

    expect(await loadPrintableMap("t1")).toBe("blob:recadree");

    // Marge de 1,5 % du plus grand côté (30 px) autour de (500, 250)-(1500, 750)
    expect(context.drawImage).toHaveBeenLastCalledWith(
      expect.anything(),
      470,
      220,
      1060,
      560,
      0,
      0,
      1060,
      560
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:carte");
  });

  it("garde l'image d'origine si elle n'a pas de marge ou si le canvas est indisponible, échoue sans carte", async () => {
    mockApi({
      "GET /api/territoires/t1/carte": jsonResponse({}),
      "GET /api/territoires/t2/carte": jsonResponse({}, 404),
    });
    stubImage(800, 600);

    // Carte sans marge : rien à découper, l'image n'est pas réencodée
    const { toBlob } = stubCanvas(
      pixels(400, 300, [{ x: 0, y: 0, width: 400, height: 300 }])
    );
    expect(await loadPrintableMap("t1")).toBe("blob:carte");
    expect(toBlob).not.toHaveBeenCalled();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(await loadPrintableMap("t1")).toBe("blob:carte");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    await expect(loadPrintableMap("t2")).rejects.toThrow("404");
  });

  it("charge au plus 4 cartes à la fois, saute celles qui ne sont plus voulues et libère les images", async () => {
    const pending: Record<
      string,
      { resolve: (url: string) => void; reject: (e: Error) => void }
    > = {};
    const load = vi.fn(
      (id: string) =>
        new Promise<string>((resolve, reject) => {
          pending[id] = { resolve, reject };
        })
    );
    const onChange = vi.fn();
    const loader = createPrintableMapLoader(onChange, load);

    loader.want(["a", "b", "c", "d", "e", "f"]);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a", "b", "c", "d"]);

    // "e" désélectionné pendant qu'il attend son tour : on passe directement à "f"
    loader.want(["a", "b", "c", "d", "f"]);
    pending.a.resolve("blob:a");
    pending.b.reject(new Error("404"));
    await flush();
    expect(onChange).toHaveBeenCalledWith("a", {
      status: "ready",
      url: "blob:a",
    });
    expect(onChange).toHaveBeenCalledWith("b", { status: "error" });
    expect(load.mock.calls.map(([id]) => id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "f",
    ]);

    // Une carte déjà chargée n'est pas redemandée
    loader.want(["a"]);
    expect(load).toHaveBeenCalledTimes(5);

    // Page quittée : images libérées, chargements en cours ignorés
    loader.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a");
    pending.c.resolve("blob:c");
    await flush();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:c");
    expect(onChange).not.toHaveBeenCalledWith("c", expect.anything());
  });
});
