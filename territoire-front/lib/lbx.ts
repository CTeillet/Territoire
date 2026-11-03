import { strToU8, zipSync } from "fflate";
import { textWidth } from "@/lib/text-width";

/**
 * Fichier .lbx de Brother P-touch Editor, que P-touch Design&Print 2 (iPhone, Android) ouvre puis imprime : une
 * archive ZIP avec label.xml (mise en page) et prop.xml (métadonnées), sans spécification publique.
 *
 * Le modèle reprend un fichier enregistré par P-touch Editor pour un PT-P710BT et un ruban de 12 mm, longueur
 * automatique, avec un objet texte : default-text-only-12mm.lbx de github.com/jdlien/lbx-utils
 * (data/label_templates), même structure que les fichiers réels de github.com/orochi235/bil-lbx (test/fixtures).
 * Seuls changent les deux objets texte (contenu, police, taille, position) et la longueur de l'étiquette.
 *
 * Unités : points (1/72 de pouce). En paysage, x suit la longueur du ruban et y sa largeur.
 */

/** Deux lignes centrées : le nom en gras au-dessus de l'échéance. */
export interface LbxLabelText {
  name: string;
  dueDate: string;
}

// Ruban de 12 mm (format 259) : 28 pt imprimables entre deux marges de 2,8 pt, 2 mm de marge à chaque bout
const TAPE_WIDTH = 33.6;
const SIDE_MARGIN = 2.8;
const END_MARGIN = 5.6;
const PRINTABLE_HEIGHT = TAPE_WIDTH - 2 * SIDE_MARGIN;
// Longueur maximale (1 m) : P-touch Editor la note dans le papier quand la longueur est automatique
const MAX_PAPER_LENGTH = 2834.4;

// Comme l'étiquette imprimée en Bluetooth : nom 1,3 fois plus grand que la date, sur toute la hauteur imprimable.
// Chaque cadre a la hauteur d'une ligne d'Arial (1,117 fois la taille) avec un peu de marge.
const FONT = "Arial";
const NAME_FRAME_HEIGHT = 15.4;
const NAME_SIZE = 13.5;
const DATE_SIZE = 10.4;
// Un nom plus long que 70 mm est écrit plus petit, jusqu'à 8 pt ; au-delà, l'étiquette s'allonge
const MAX_TEXT_LENGTH = 198.4;
const MIN_NAME_SIZE = 8;
// Le rendu de Design&Print 2 peut être un peu plus large que l'estimation : le texte, centré, garde de la place
const LENGTH_SLACK = 1.05;
const MIN_TEXT_LENGTH = 28;

const pt = (value: number) => `${Math.round(value * 10) / 10}pt`;

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Une ligne de texte en Unicode composé (NFC) : sauts de ligne et espaces multiples ramenés à une espace,
 * caractères interdits en XML retirés, ainsi que ceux hors du plan multilingue de base (émojis). Ainsi
 * chaque caractère compte pour un dans charLen, quelle que soit la façon de compter de l'application.
 */
function cleanLine(text: string): string {
  let clean = "";
  for (const char of text.normalize("NFC")) {
    const code = char.codePointAt(0)!;
    if (/\s/.test(char) || code < 0x20 || (code >= 0x7f && code < 0xa0)) {
      clean += " ";
    } else if (code <= 0xfffd && (code < 0xd800 || code > 0xdfff)) {
      clean += char;
    }
  }
  return clean.replace(/ {2,}/g, " ").trim();
}

interface TextObject {
  objectName: string;
  text: string;
  bold: boolean;
  size: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const fontInfo = ({ bold, size }: TextObject) =>
  `<text:ptFontInfo><text:logFont name="${FONT}" width="0" italic="false" weight="${bold ? 700 : 400}" charSet="0" pitchAndFamily="2"></text:logFont>` +
  `<text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="${pt(size)}" orgSize="28.8pt" textColor="#000000" textPrintColorNumber="1"></text:fontExt></text:ptFontInfo>`;

/** Objet texte natif : cadre fixe, texte centré, réduit par l'application s'il déborde. */
const textXml = (object: TextObject) =>
  `<text:text><pt:objectStyle x="${pt(object.x)}" y="${pt(object.y)}" width="${pt(object.width)}" height="${pt(object.height)}" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE">` +
  `<pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"></pt:pen>` +
  `<pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"></pt:brush>` +
  `<pt:expanded objectName="${object.objectName}" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"></pt:expanded></pt:objectStyle>` +
  fontInfo(object) +
  `<text:textControl control="FIXEDFRAME" clipFrame="false" aspectNormal="true" shrink="true" autoLF="false" avoidImage="false"></text:textControl>` +
  `<text:textAlign horizontalAlignment="CENTER" verticalAlignment="CENTER" inLineAlignment="BASELINE"></text:textAlign>` +
  `<text:textStyle vertical="false" nullBlock="false" charSpace="0" lineSpace="0" orgPoint="${pt(object.size)}" combinedChars="false"></text:textStyle>` +
  `<pt:data>${escapeXml(object.text)}</pt:data>` +
  `<text:stringItem charLen="${object.text.length}">${fontInfo(object)}</text:stringItem></text:text>`;

/** Les deux objets texte et la longueur imprimable de l'étiquette. */
export function lbxLayout(label: LbxLabelText) {
  const name = cleanLine(label.name);
  const dueDate = cleanLine(label.dueDate);
  if (!name || !dueDate) throw new Error("Texte de l'étiquette vide");

  let nameSize = NAME_SIZE;
  const nameWidth = textWidth(name, NAME_SIZE, true);
  if (nameWidth > MAX_TEXT_LENGTH) {
    nameSize = Math.max(
      MIN_NAME_SIZE,
      Math.floor(((NAME_SIZE * MAX_TEXT_LENGTH) / nameWidth) * 10) / 10
    );
  }
  const widest = Math.max(
    textWidth(name, nameSize, true),
    textWidth(dueDate, DATE_SIZE)
  );
  const length = Math.max(MIN_TEXT_LENGTH, Math.ceil(widest * LENGTH_SLACK));

  const frame = { x: END_MARGIN, width: length };
  const objects: TextObject[] = [
    {
      objectName: "Text1",
      text: name,
      bold: true,
      size: nameSize,
      ...frame,
      y: SIDE_MARGIN,
      height: NAME_FRAME_HEIGHT,
    },
    {
      objectName: "Text2",
      text: dueDate,
      bold: false,
      size: DATE_SIZE,
      ...frame,
      y: SIDE_MARGIN + NAME_FRAME_HEIGHT,
      height: PRINTABLE_HEIGHT - NAME_FRAME_HEIGHT,
    },
  ];
  return { objects, length };
}

function labelXml(label: LbxLabelText): string {
  const { objects, length } = lbxLayout(label);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<pt:document xmlns:pt="http://schemas.brother.info/ptouch/2007/lbx/main" xmlns:style="http://schemas.brother.info/ptouch/2007/lbx/style" xmlns:text="http://schemas.brother.info/ptouch/2007/lbx/text" xmlns:draw="http://schemas.brother.info/ptouch/2007/lbx/draw" xmlns:image="http://schemas.brother.info/ptouch/2007/lbx/image" xmlns:barcode="http://schemas.brother.info/ptouch/2007/lbx/barcode" xmlns:database="http://schemas.brother.info/ptouch/2007/lbx/database" xmlns:table="http://schemas.brother.info/ptouch/2007/lbx/table" xmlns:cable="http://schemas.brother.info/ptouch/2007/lbx/cable" version="1.9" generator="com.brother.PtouchEditor">` +
    `<pt:body currentSheet="Sheet 1" direction="LTR"><style:sheet name="Sheet 1">` +
    `<style:paper media="0" width="${pt(TAPE_WIDTH)}" height="${pt(MAX_PAPER_LENGTH)}" marginLeft="${pt(SIDE_MARGIN)}" marginTop="${pt(END_MARGIN)}" marginRight="${pt(SIDE_MARGIN)}" marginBottom="${pt(END_MARGIN)}" orientation="landscape" autoLength="true" monochromeDisplay="true" printColorDisplay="false" printColorsID="0" paperColor="#FFFFFF" paperInk="#000000" split="1" format="259" backgroundTheme="0" printerID="30256" printerName="Brother PT-P710BT"></style:paper>` +
    `<style:cutLine regularCut="0pt" freeCut=""></style:cutLine>` +
    // Longueur automatique : la longueur de l'étiquette est celle du fond
    `<style:backGround x="${pt(END_MARGIN)}" y="${pt(SIDE_MARGIN)}" width="${pt(length)}" height="${pt(PRINTABLE_HEIGHT)}" brushStyle="NULL" brushId="0" userPattern="NONE" userPatternId="0" color="#000000" printColorNumber="1" backColor="#FFFFFF" backPrintColorNumber="0"></style:backGround>` +
    `<pt:objects>${objects.map(textXml).join("")}</pt:objects>` +
    `</style:sheet></pt:body></pt:document>`
  );
}

// Dates ISO à la seconde, comme P-touch Editor
const isoSecond = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

function propXml(created: Date): string {
  const date = isoSecond(created);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<meta:properties xmlns:meta="http://schemas.brother.info/ptouch/2007/lbx/meta" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">` +
    `<meta:appName>com.brother.PtouchEditor</meta:appName><dc:title></dc:title><dc:subject></dc:subject><dc:creator></dc:creator>` +
    `<meta:keyword></meta:keyword><dc:description></dc:description><meta:template></meta:template>` +
    `<dcterms:created>${date}</dcterms:created><dcterms:modified>${date}</dcterms:modified>` +
    `<meta:lastPrinted></meta:lastPrinted><meta:modifiedBy></meta:modifiedBy><meta:revision>1</meta:revision>` +
    `<meta:editTime>0</meta:editTime><meta:numPages>1</meta:numPages><meta:numWords>0</meta:numWords>` +
    `<meta:numChars>0</meta:numChars><meta:security>0</meta:security><meta:transferScript></meta:transferScript>` +
    `</meta:properties>`
  );
}

/** Contenu du fichier .lbx : label.xml puis prop.xml, compressés (Deflate) comme ceux de P-touch Editor. */
export function buildLabelLbx(
  label: LbxLabelText,
  created: Date = new Date()
): Uint8Array {
  return zipSync(
    {
      "label.xml": strToU8(labelXml(label)),
      "prop.xml": strToU8(propXml(created)),
    },
    { level: 6, mtime: created }
  );
}
