import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast } from "sonner";
import {
  assignmentLabelFile,
  assignmentLabelText,
  autoPrintAssignmentLabel,
  printAssignmentLabel,
  renderLabel,
} from "@/lib/assignment-label";
import * as labelPrinter from "@/lib/label-printer";
import { lbxTexts, readZip } from "../mocks/lbx-archive";

vi.mock("sonner", () => ({
  toast: { loading: vi.fn(() => "toast-1"), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/label-printer", () => ({
  getLabelPrinter: vi.fn(),
  isAutoPrintEnabled: vi.fn(),
  isLabelPrintingSupported: vi.fn(),
  printLabel: vi.fn(),
}));

const assignment = {
  person: { id: "p1", firstName: " Corentin ", lastName: "teillet" },
  dueDate: "2027-03-03",
};

/** Contexte 2D minimal : chaque caractère fait une demi-taille de police de large, tout est noir. */
function stubCanvas() {
  const fillText = vi.fn();
  const context = {
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    fillRect: vi.fn(),
    fillText,
    measureText(text: string) {
      const size = parseFloat(/([\d.]+)px/.exec(this.font)![1]);
      return {
        width: (text.length * size) / 2,
        fontBoundingBoxAscent: size * 0.9,
        fontBoundingBoxDescent: size * 0.2,
      };
    },
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as never
  );
  return fillText;
}

beforeEach(() => {
  vi.mocked(labelPrinter.isLabelPrintingSupported).mockReturnValue(true);
  vi.mocked(labelPrinter.isAutoPrintEnabled).mockReturnValue(true);
  vi.mocked(labelPrinter.getLabelPrinter).mockResolvedValue({} as never);
  vi.mocked(labelPrinter.printLabel).mockReset().mockResolvedValue();
  Object.values(toast).forEach((fn) => vi.mocked(fn).mockClear());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assignment-label", () => {
  it("écrit le prénom, l'initiale du nom et l'échéance", () => {
    expect(assignmentLabelText(assignment)).toEqual({
      name: "Corentin T.",
      dueDate: "À rendre le 03/03/2027",
    });
    expect(
      assignmentLabelText({
        ...assignment,
        person: { id: "p2", firstName: "Anne", lastName: "" },
      })?.name
    ).toBe("Anne");
    expect(
      assignmentLabelText({ person: undefined, dueDate: "2027-03-03" })
    ).toBeNull();
    expect(assignmentLabelText(undefined)).toBeNull();
  });

  it("recopie l'échéance du backend, sans décalage de fuseau horaire", () => {
    const timeZone = process.env.TZ;
    try {
      for (const zone of ["Pacific/Kiritimati", "America/Los_Angeles"]) {
        process.env.TZ = zone;
        expect(assignmentLabelText(assignment)?.dueDate).toBe(
          "À rendre le 03/03/2027"
        );
        expect(
          assignmentLabelText({
            ...assignment,
            dueDate: "2027-01-01T00:00:00Z",
          })?.dueDate
        ).toBe("À rendre le 01/01/2027");
      }
    } finally {
      if (timeZone === undefined) delete process.env.TZ;
      else process.env.TZ = timeZone;
    }
  });

  it("prépare le fichier LBX de l'étiquette, nommé d'après la personne et l'échéance", async () => {
    const label = assignmentLabelFile({
      person: { id: "p1", firstName: "Zoé", lastName: "ñúñez" },
      // Échéance modifiée après l'attribution : celle du backend, telle quelle
      dueDate: "2027-05-17",
    })!;

    expect(label.text).toEqual({
      name: "Zoé Ñ.",
      dueDate: "À rendre le 17/05/2027",
    });
    expect(label.file.name).toBe("etiquette-zoe-n-2027-05-17.lbx");
    expect(label.file.type).toBe("application/octet-stream");
    const { files } = readZip(new Uint8Array(await label.file.arrayBuffer()));
    expect(lbxTexts(files["label.xml"]).map(({ data }) => data)).toEqual([
      "Zoé Ñ.",
      "À rendre le 17/05/2027",
    ]);
  });

  it("ne prépare pas de fichier pour une attribution sans personne (campagne)", () => {
    expect(
      assignmentLabelFile({ person: undefined, dueDate: "2027-03-03" })
    ).toBeNull();
    expect(assignmentLabelFile(null)).toBeNull();
  });

  it("dessine le nom au-dessus de la date, centrés, avec 2 mm de marge à chaque bout", () => {
    const fillText = stubCanvas();

    const bitmap = renderLabel(
      { name: "Corentin T.", dueDate: "À rendre le 03/03/2027" },
      64
    );

    // Taille de la date : (64 - 3) / (1,1 × 2,3) ; la ligne la plus longue fixe la largeur
    const dateSize = 61 / (1.1 * 2.3);
    expect(bitmap.height).toBe(64);
    expect(bitmap.width).toBe(Math.ceil((22 * dateSize) / 2) + 2 * 14);
    expect(bitmap.ink).toHaveLength(bitmap.width * 64);
    expect(bitmap.ink.every((dot) => dot === 1)).toBe(true);
    const [[name, nameX, nameY], [date, , dateY]] = fillText.mock.calls;
    expect(name).toBe("Corentin T.");
    expect(nameX).toBe(bitmap.width / 2);
    expect(nameY).toBeCloseTo(0.9 * 1.3 * dateSize);
    expect(date).toBe("À rendre le 03/03/2027");
    expect(dateY).toBeCloseTo(1.1 * 1.3 * dateSize + 3 + 0.9 * dateSize);
  });

  it("refuse de dessiner sans canvas", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() =>
      renderLabel({ name: "Anne", dueDate: "À rendre le 03/03/2027" }, 64)
    ).toThrow("Dessin de l'étiquette impossible");
  });

  it("suit l'impression par un message, avec « Réessayer » en cas d'échec", async () => {
    await printAssignmentLabel(assignment);
    expect(toast.loading).toHaveBeenCalledWith(
      "Impression de l'étiquette de Corentin T.…"
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Étiquette de Corentin T. imprimée",
      { id: "toast-1" }
    );

    vi.mocked(labelPrinter.printLabel).mockRejectedValueOnce(
      new Error("Impression impossible : capot ouvert.")
    );
    await printAssignmentLabel(assignment);
    expect(toast.error).toHaveBeenCalledWith(
      "Impression impossible : capot ouvert.",
      expect.objectContaining({ id: "toast-1" })
    );

    const { action } = vi.mocked(toast.error).mock.calls[0][1] as {
      action: { label: string; onClick: () => void };
    };
    expect(action.label).toBe("Réessayer");
    action.onClick();
    await vi.waitFor(() =>
      expect(labelPrinter.printLabel).toHaveBeenCalledTimes(3)
    );
  });

  it("n'imprime automatiquement que sur un appareil réglé pour", async () => {
    await autoPrintAssignmentLabel(assignment);
    expect(labelPrinter.printLabel).toHaveBeenCalledTimes(1);

    await autoPrintAssignmentLabel(undefined);
    await autoPrintAssignmentLabel({ ...assignment, person: undefined });

    vi.mocked(labelPrinter.getLabelPrinter).mockResolvedValue(null);
    await autoPrintAssignmentLabel(assignment);

    vi.mocked(labelPrinter.isAutoPrintEnabled).mockReturnValue(false);
    await autoPrintAssignmentLabel(assignment);

    vi.mocked(labelPrinter.isLabelPrintingSupported).mockReturnValue(false);
    await autoPrintAssignmentLabel(assignment);

    expect(labelPrinter.printLabel).toHaveBeenCalledTimes(1);
  });
});
