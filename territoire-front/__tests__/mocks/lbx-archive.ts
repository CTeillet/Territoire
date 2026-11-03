import { crc32, inflateRawSync } from "node:zlib";

/**
 * Lecture d'une archive ZIP indépendante de la bibliothèque qui l'a écrite : répertoire central, en-têtes
 * locaux, décompression par zlib, contrôle des tailles et des CRC. Les fichiers sont décodés en UTF-8 strict.
 */
export function readZip(bytes: Uint8Array): {
  names: string[];
  methods: number[];
  files: Record<string, string>;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);

  // Fin du répertoire central : 22 octets à la fin (pas de commentaire)
  const end = bytes.length - 22;
  if (u32(end) !== 0x06054b50) throw new Error("Fin d'archive introuvable");
  const count = u16(end + 10);
  let entry = u32(end + 16);

  const names: string[] = [];
  const methods: number[] = [];
  const files: Record<string, string> = {};
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  for (let i = 0; i < count; i++) {
    if (u32(entry) !== 0x02014b50) throw new Error("Entrée centrale invalide");
    const method = u16(entry + 10);
    const crc = u32(entry + 16);
    const compressedSize = u32(entry + 20);
    const size = u32(entry + 24);
    const nameLength = u16(entry + 28);
    const local = u32(entry + 42);
    const name = utf8.decode(
      bytes.subarray(entry + 46, entry + 46 + nameLength)
    );
    entry += 46 + nameLength + u16(entry + 30) + u16(entry + 32);

    if (u32(local) !== 0x04034b50) throw new Error("En-tête local invalide");
    const start = local + 30 + u16(local + 26) + u16(local + 28);
    const stored = bytes.subarray(start, start + compressedSize);
    if (method !== 0 && method !== 8) throw new Error("Compression inconnue");
    const content =
      method === 8 ? new Uint8Array(inflateRawSync(stored)) : stored;
    if (content.length !== size) throw new Error(`Taille de ${name} fausse`);
    if (crc32(content) !== crc) throw new Error(`CRC de ${name} faux`);

    names.push(name);
    methods.push(method);
    files[name] = utf8.decode(content);
  }
  return { names, methods, files };
}

/** XML bien formé (sinon erreur), avec ses espaces de noms. */
export function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const error = document.getElementsByTagName("parsererror")[0];
  if (error) throw new Error(`XML invalide : ${error.textContent}`);
  return document;
}

export const LBX_NS = {
  pt: "http://schemas.brother.info/ptouch/2007/lbx/main",
  style: "http://schemas.brother.info/ptouch/2007/lbx/style",
  text: "http://schemas.brother.info/ptouch/2007/lbx/text",
  meta: "http://schemas.brother.info/ptouch/2007/lbx/meta",
  dcterms: "http://purl.org/dc/terms/",
};

/** Objets texte de label.xml : contenu, longueur déclarée, police et cadre. */
export function lbxTexts(labelXml: string) {
  const document = parseXml(labelXml);
  const points = (element: Element, name: string) =>
    parseFloat(element.getAttribute(name)!);
  return Array.from(
    document.getElementsByTagNameNS(LBX_NS.text, "text"),
    (object) => {
      const style = object.getElementsByTagNameNS(LBX_NS.pt, "objectStyle")[0];
      const font = object.getElementsByTagNameNS(LBX_NS.text, "logFont")[0];
      const size = object.getElementsByTagNameNS(LBX_NS.text, "fontExt")[0];
      const items = object.getElementsByTagNameNS(LBX_NS.text, "stringItem");
      const align = object.getElementsByTagNameNS(LBX_NS.text, "textAlign")[0];
      return {
        data: object.getElementsByTagNameNS(LBX_NS.pt, "data")[0].textContent,
        charLen: Array.from(items).reduce(
          (sum, item) => sum + Number(item.getAttribute("charLen")),
          0
        ),
        font: font.getAttribute("name"),
        weight: font.getAttribute("weight"),
        size: points(size, "size"),
        align: align.getAttribute("horizontalAlignment"),
        x: points(style, "x"),
        y: points(style, "y"),
        width: points(style, "width"),
        height: points(style, "height"),
      };
    }
  );
}
