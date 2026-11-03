import { describe, it, expect, vi, afterEach } from "vitest";
import {
  canShareFile,
  downloadFile,
  safeFileName,
  shareFile,
} from "@/lib/file-share";
import { captureDownloads, stubShare, unstubShare } from "../mocks/ios";

const file = new File(["contenu"], "etiquette-corentin-t-2027-03-03.lbx", {
  type: "application/octet-stream",
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  unstubShare();
});

describe("file-share", () => {
  it("donne un nom de fichier sûr et lisible", () => {
    expect(safeFileName("Étiquette Zoé Ñ. 2027-03-03", "lbx")).toBe(
      "etiquette-zoe-n-2027-03-03.lbx"
    );
    expect(safeFileName(" ../<Œil> & co/ ", "lbx")).toBe("il-co.lbx");
    expect(safeFileName("😀", "lbx")).toBe("fichier.lbx");
    expect(safeFileName("a".repeat(200), "lbx")).toBe(`${"a".repeat(80)}.lbx`);
  });

  it("télécharge le fichier sous son nom, puis libère son adresse", () => {
    vi.useFakeTimers();
    const downloads = captureDownloads();

    downloadFile(file);

    expect(downloads).toEqual([{ name: file.name, file }]);
    // Le lien temporaire ne reste pas dans la page
    expect(document.querySelector("a[download]")).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0");
  });

  it("ne propose le partage que si le navigateur accepte le fichier", () => {
    expect(canShareFile(file)).toBe(false);

    stubShare(false);
    expect(canShareFile(file)).toBe(false);

    stubShare(true);
    expect(canShareFile(file)).toBe(true);
    expect(navigator.canShare).toHaveBeenCalledWith({ files: [file] });

    Object.defineProperty(navigator, "canShare", {
      value: () => {
        throw new TypeError("Type de fichier refusé");
      },
      configurable: true,
    });
    expect(canShareFile(file)).toBe(false);
  });

  it("partage le fichier ; une annulation n'est pas une erreur, un refus l'est", async () => {
    const share = stubShare(true);
    await expect(shareFile(file)).resolves.toBe(true);
    expect(share).toHaveBeenCalledWith({ files: [file] });

    stubShare(true, () =>
      Promise.reject(new DOMException("Annulé", "AbortError"))
    );
    await expect(shareFile(file)).resolves.toBe(false);

    stubShare(true, () =>
      Promise.reject(new DOMException("Refusé", "NotAllowedError"))
    );
    await expect(shareFile(file)).rejects.toThrow("Refusé");
  });
});
