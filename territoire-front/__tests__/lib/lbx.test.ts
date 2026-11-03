import { describe, it, expect } from "vitest";
import { buildLabelLbx, lbxLayout } from "@/lib/lbx";
import { textWidth } from "@/lib/text-width";
import { LBX_NS, lbxTexts, parseXml, readZip } from "../mocks/lbx-archive";

const label = { name: "Corentin T.", dueDate: "À rendre le 03/03/2027" };
const created = new Date("2026-11-03T16:45:12.345Z");

describe("lbx", () => {
  it("écrit une archive ZIP avec label.xml puis prop.xml, compressés", () => {
    const { names, methods, files } = readZip(buildLabelLbx(label, created));

    expect(names).toEqual(["label.xml", "prop.xml"]);
    expect(methods).toEqual([8, 8]);
    expect(files["label.xml"]).toMatch(
      /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<pt:document /
    );
  });

  it("garde la mise en page du modèle P-touch Editor : PT-P710BT, ruban de 12 mm, longueur automatique", () => {
    const xml = readZip(buildLabelLbx(label, created)).files["label.xml"];
    const document = parseXml(xml);

    const root = document.documentElement;
    expect(root.namespaceURI).toBe(LBX_NS.pt);
    expect(root.localName).toBe("document");
    expect(root.getAttribute("generator")).toBe("com.brother.PtouchEditor");
    const paper = document.getElementsByTagNameNS(LBX_NS.style, "paper")[0];
    expect(paper.getAttribute("width")).toBe("33.6pt");
    expect(paper.getAttribute("format")).toBe("259");
    expect(paper.getAttribute("orientation")).toBe("landscape");
    expect(paper.getAttribute("autoLength")).toBe("true");
    expect(paper.getAttribute("printerName")).toBe("Brother PT-P710BT");
    expect(paper.getAttribute("printerID")).toBe("30256");

    // Fond (longueur de l'étiquette) et objets dans la bande imprimable de 28 pt
    const background = document.getElementsByTagNameNS(
      LBX_NS.style,
      "backGround"
    )[0];
    expect(background.getAttribute("x")).toBe("5.6pt");
    expect(background.getAttribute("y")).toBe("2.8pt");
    expect(background.getAttribute("height")).toBe("28pt");
    const texts = lbxTexts(xml);
    for (const text of texts) {
      expect(text.x).toBe(5.6);
      expect(`${text.width}pt`).toBe(background.getAttribute("width"));
      expect(text.align).toBe("CENTER");
    }
    expect(texts[0].y).toBe(2.8);
    expect(texts[0].y + texts[0].height).toBe(texts[1].y);
    expect(texts[1].y + texts[1].height).toBeCloseTo(30.8);
  });

  it("écrit deux objets texte natifs : le nom en gras au-dessus de l'échéance, plus petite", () => {
    const [name, date] = lbxTexts(
      readZip(buildLabelLbx(label, created)).files["label.xml"]
    );

    expect(name).toMatchObject({
      data: "Corentin T.",
      charLen: 11,
      font: "Arial",
      weight: "700",
      size: 13.5,
    });
    expect(date).toMatchObject({
      data: "À rendre le 03/03/2027",
      charLen: 22,
      font: "Arial",
      weight: "400",
      size: 10.4,
    });
    // La date, plus longue, fixe la longueur
    expect(name.width).toBe(
      Math.ceil(textWidth("À rendre le 03/03/2027", 10.4) * 1.05)
    );
  });

  it("date les métadonnées de prop.xml", () => {
    const document = parseXml(
      readZip(buildLabelLbx(label, created)).files["prop.xml"]
    );

    expect(
      document.getElementsByTagNameNS(LBX_NS.meta, "appName")[0].textContent
    ).toBe("com.brother.PtouchEditor");
    expect(
      document.getElementsByTagNameNS(LBX_NS.dcterms, "created")[0].textContent
    ).toBe("2026-11-03T16:45:12Z");
    expect(
      document.getElementsByTagNameNS(LBX_NS.dcterms, "modified")[0].textContent
    ).toBe("2026-11-03T16:45:12Z");
  });

  it("échappe les caractères spéciaux et garde les accents, en Unicode composé", () => {
    const { files } = readZip(
      buildLabelLbx(
        {
          // « é » décomposé (e + accent), saut de ligne, émoji et caractère de contrôle
          name: `Zoé & <Léa> "O'Brien"\n😀\u0007 Ñ.`,
          dueDate: "À rendre le 03/03/2027",
        },
        created
      )
    );

    expect(files["label.xml"]).toContain(
      "<pt:data>Zoé &amp; &lt;Léa&gt; &quot;O&apos;Brien&quot; Ñ.</pt:data>"
    );
    const [name] = lbxTexts(files["label.xml"]);
    expect(name.data).toBe(`Zoé & <Léa> "O'Brien" Ñ.`);
    expect(name.charLen).toBe(name.data!.length);
  });

  it("écrit plus petit un nom long, puis allonge l'étiquette", () => {
    const long = lbxLayout({
      name: "Marie-Bernadette-Antoinette-Clémentine D.",
      dueDate: label.dueDate,
    });
    const [longName] = long.objects;
    expect(longName.size).toBeLessThan(13.5);
    expect(longName.size).toBeGreaterThanOrEqual(8);
    // 70 mm de texte au plus, avec la marge de sécurité
    expect(long.length).toBeLessThanOrEqual(Math.ceil(198.4 * 1.05));

    const veryLong = lbxLayout({
      name: "Marie-Bernadette-Antoinette-Clémentine-Hortense-Philomène-Eugénie D.",
      dueDate: label.dueDate,
    });
    expect(veryLong.objects[0].size).toBe(8);
    expect(veryLong.length).toBeGreaterThan(Math.ceil(198.4 * 1.05));

    // Nom court : taille normale, l'étiquette ne descend pas sous 10 mm
    const short = lbxLayout({ name: "Al", dueDate: "1" });
    expect(short.objects[0].size).toBe(13.5);
    expect(short.length).toBe(28);
  });

  it("refuse une étiquette sans texte", () => {
    expect(() => buildLabelLbx({ name: " \n ", dueDate: "x" })).toThrow(
      "Texte de l'étiquette vide"
    );
  });
});
