import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast, Toaster } from "sonner";
import {
  labelAfterAssignment,
  offerAssignmentLabelFile,
} from "@/components/shared/assignment-label-file";
import * as assignmentLabel from "@/lib/assignment-label";
import { setAutoPrintEnabled } from "@/lib/label-printer";
import { lbxTexts, readZip } from "../mocks/lbx-archive";
import {
  captureDownloads,
  stubIPhone,
  stubNativeApp,
  stubShare,
  unstubNativeApp,
  unstubShare,
} from "../mocks/ios";
import {
  FakePrinterPort,
  stubSerial,
  unstubSerial,
} from "../mocks/serial-port";

const assignment = {
  id: "as1",
  person: { id: "p1", firstName: "Corentin", lastName: "Teillet" },
  dueDate: "2027-03-03",
};

const card = () => screen.queryByText("Étiquette prête");

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
  render(<Toaster />);
});

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  unstubShare();
  unstubSerial();
  unstubNativeApp();
});

describe("Étiquette en fichier LBX", () => {
  it("propose le fichier dans une carte qui reste affichée, jusqu'à sa fermeture", async () => {
    const downloads = captureDownloads();

    act(() => offerAssignmentLabelFile(assignment));

    expect(await screen.findByText("Étiquette prête")).toBeInTheDocument();
    expect(
      screen.getByText("Corentin T. · À rendre le 03/03/2027")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choisissez Design&Print 2 dans les options de partage/)
    ).toBeInTheDocument();
    // Navigateur sans partage de fichiers : le téléchargement seul
    expect(
      screen.queryByRole("button", { name: "Partager" })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Télécharger" }));
    expect(downloads.map(({ name }) => name)).toEqual([
      "etiquette-corentin-t-2027-03-03.lbx",
    ]);
    const { files } = readZip(
      new Uint8Array(await downloads[0].file.arrayBuffer())
    );
    expect(lbxTexts(files["label.xml"]).map(({ data }) => data)).toEqual([
      "Corentin T.",
      "À rendre le 03/03/2027",
    ]);
    // Toujours là : un second téléchargement reste possible
    expect(card()).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(card()).not.toBeInTheDocument());
  });

  it("propose aussi le partage quand le navigateur accepte le fichier ; l'annuler n'est pas une erreur", async () => {
    const share = stubShare(true, () =>
      Promise.reject(new DOMException("Annulé", "AbortError"))
    );

    act(() => offerAssignmentLabelFile(assignment));
    await userEvent.click(
      await screen.findByRole("button", { name: "Partager" })
    );

    expect(share).toHaveBeenCalledWith({
      files: [
        expect.objectContaining({
          name: "etiquette-corentin-t-2027-03-03.lbx",
        }),
      ],
    });
    expect(screen.queryByText(/refuse de partager/)).not.toBeInTheDocument();
    expect(card()).toBeInTheDocument();
  });

  it("renvoie au téléchargement si le partage est refusé", async () => {
    stubShare(true, () =>
      Promise.reject(new DOMException("Refusé", "NotAllowedError"))
    );

    act(() => offerAssignmentLabelFile(assignment));
    await userEvent.click(
      await screen.findByRole("button", { name: "Partager" })
    );

    expect(
      await screen.findByText(
        "Le navigateur refuse de partager ce fichier : utilisez « Télécharger »."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeVisible();
  });

  it("ne propose rien pour une attribution sans personne (campagne)", async () => {
    act(() => offerAssignmentLabelFile({ ...assignment, person: undefined }));
    await act(async () => {});

    expect(card()).not.toBeInTheDocument();
  });

  it("signale un fichier non généré, sans lever d'erreur", async () => {
    vi.spyOn(assignmentLabel, "assignmentLabelFile").mockImplementation(() => {
      throw new Error("Archive impossible");
    });

    expect(() => offerAssignmentLabelFile(assignment)).not.toThrow();

    expect(
      await screen.findByText(
        "Le fichier de l'étiquette n'a pas pu être généré."
      )
    ).toBeInTheDocument();
    expect(card()).not.toBeInTheDocument();
  });
});

describe("Étiquette après une attribution", () => {
  it("dans l'app iOS TMS avec l'impression automatique, imprime aussitôt par l'app, sans lien ni fichier", async () => {
    const postMessage = stubNativeApp();
    setAutoPrintEnabled(true);

    await act(() => labelAfterAssignment(assignment));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: "print", name: "Corentin T." })
    );
    expect(
      await screen.findByText("Étiquette de Corentin T. imprimée")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Imprimer" })).toBeNull();
    expect(card()).not.toBeInTheDocument();
  });

  it("dans l'app iOS TMS sans impression automatique, propose « Imprimer » dans une carte", async () => {
    const postMessage = stubNativeApp(() => ({
      printed: false,
      message: "Le ruban est absent.",
    }));

    await act(() => labelAfterAssignment(assignment));
    expect(postMessage).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Étiquette prête à imprimer")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Corentin T. · À rendre le 03/03/2027")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Imprimer" }));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: "print", dueDate: "2027-03-03" })
    );
    expect(await screen.findByText("Le ruban est absent.")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText("Étiquette prête à imprimer")
      ).not.toBeInTheDocument()
    );
  });

  it("dans l'app iOS TMS, ne propose rien pour une campagne", async () => {
    const postMessage = stubNativeApp();
    setAutoPrintEnabled(true);

    await act(() => labelAfterAssignment({ ...assignment, person: undefined }));
    setAutoPrintEnabled(false);
    await act(() => labelAfterAssignment({ ...assignment, person: undefined }));

    expect(postMessage).not.toHaveBeenCalled();
    expect(screen.queryByText("Étiquette prête à imprimer")).toBeNull();
  });

  it("sur iPhone, prépare le fichier sans Web Serial ni impression automatique", async () => {
    stubIPhone();
    const autoPrint = vi.spyOn(assignmentLabel, "autoPrintAssignmentLabel");

    await act(() => labelAfterAssignment(assignment));

    expect(await screen.findByText("Étiquette prête")).toBeInTheDocument();
    expect(autoPrint).not.toHaveBeenCalled();
  });

  it("ailleurs, imprime toujours par Web Serial sur un appareil réglé pour", async () => {
    // Canvas minimal : jsdom ne dessine pas
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: () => ({ width: 40 }),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
    } as never);
    const port = new FakePrinterPort();
    stubSerial([port]);
    setAutoPrintEnabled(true);

    await act(() => labelAfterAssignment(assignment));

    expect(port.jobs).toBe(1);
    expect(await screen.findByText("Étiquette de Corentin T. imprimée"));
    expect(card()).not.toBeInTheDocument();
  });

  it("ne rejette pas quand Web Serial échoue : l'attribution reste enregistrée", async () => {
    Object.defineProperty(navigator, "serial", {
      value: {
        requestPort: vi.fn(),
        getPorts: vi.fn().mockRejectedValue(new Error("Bloqué")),
      },
      configurable: true,
    });
    setAutoPrintEnabled(true);

    await expect(labelAfterAssignment(assignment)).resolves.toBeUndefined();
    await expect(labelAfterAssignment(undefined)).resolves.toBeUndefined();
  });
});
