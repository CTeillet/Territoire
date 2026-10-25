import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import {
  LateReportSection,
  parseRecipients,
} from "@/components/parameters/other-parameter/late-report-section";
import { jsonResponse, mockApi } from "../test-utils";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const URL = "/api/settings/recapitulatif-retards";

beforeEach(() => {
  vi.restoreAllMocks();
  Object.values(toast).forEach((fn) => vi.mocked(fn).mockClear());
});

const recipientsInput = () => screen.getByLabelText("Destinataires");

describe("parseRecipients", () => {
  it("sépare les adresses par virgules, points-virgules ou espaces", () => {
    expect(parseRecipients(" a@b.fr, c@d.fr;e@f.fr  g@h.fr ,")).toEqual([
      "a@b.fr",
      "c@d.fr",
      "e@f.fr",
      "g@h.fr",
    ]);
    expect(parseRecipients("  ")).toEqual([]);
  });
});

describe("LateReportSection", () => {
  it("affiche les destinataires enregistrés", async () => {
    mockApi({
      [`GET ${URL}`]: {
        recipients: ["a@b.fr", "c@d.fr"],
        mailConfigured: true,
      },
    });
    render(<LateReportSection />);

    await waitFor(() =>
      expect(recipientsInput()).toHaveValue("a@b.fr, c@d.fr")
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Envoyer maintenant" })
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("prévient quand aucun serveur d'envoi n'est configuré", async () => {
    mockApi({
      [`GET ${URL}`]: { recipients: ["a@b.fr"], mailConfigured: false },
    });
    render(<LateReportSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Aucun serveur d'envoi n'est configuré"
    );
    expect(
      screen.getByRole("button", { name: "Envoyer maintenant" })
    ).toBeDisabled();
  });

  it("refuse une adresse invalide sans appeler l'API", async () => {
    const api = mockApi({
      [`GET ${URL}`]: { recipients: [], mailConfigured: true },
    });
    render(<LateReportSection />);
    await waitFor(() => expect(recipientsInput()).toBeEnabled());

    fireEvent.change(recipientsInput(), {
      target: { value: "a@b.fr, pas-une-adresse" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Adresse e-mail invalide : pas-une-adresse"
    );
    expect(api).not.toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("enregistre les destinataires puis permet l'envoi", async () => {
    const api = mockApi({
      [`GET ${URL}`]: { recipients: [], mailConfigured: true },
      [`PUT ${URL}`]: {
        recipients: ["a@b.fr", "c@d.fr"],
        mailConfigured: true,
      },
    });
    render(<LateReportSection />);
    await waitFor(() => expect(recipientsInput()).toBeEnabled());
    const send = screen.getByRole("button", { name: "Envoyer maintenant" });
    expect(send).toBeDisabled();

    fireEvent.change(recipientsInput(), {
      target: { value: "a@b.fr; c@d.fr" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Destinataires enregistrés")
    );
    expect(api).toHaveBeenCalledWith(URL, {
      method: "PUT",
      body: JSON.stringify({ recipients: ["a@b.fr", "c@d.fr"] }),
    });
    expect(recipientsInput()).toHaveValue("a@b.fr, c@d.fr");
    expect(send).toBeEnabled();
  });

  it("signale la désactivation quand la liste est vidée", async () => {
    mockApi({
      [`GET ${URL}`]: { recipients: ["a@b.fr"], mailConfigured: true },
      [`PUT ${URL}`]: { recipients: [], mailConfigured: true },
    });
    render(<LateReportSection />);
    await waitFor(() => expect(recipientsInput()).toHaveValue("a@b.fr"));

    fireEvent.change(recipientsInput(), { target: { value: "" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Récapitulatif désactivé")
    );
  });

  it("envoie le récapitulatif tout de suite", async () => {
    const api = mockApi({
      [`GET ${URL}`]: { recipients: ["a@b.fr"], mailConfigured: true },
      [`POST ${URL}/envoi`]: { lateTerritories: 3, recipients: ["a@b.fr"] },
    });
    render(<LateReportSection />);
    await waitFor(() => expect(recipientsInput()).toHaveValue("a@b.fr"));

    await userEvent.click(
      screen.getByRole("button", { name: "Envoyer maintenant" })
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Récapitulatif envoyé à a@b.fr (3 territoires en retard)"
      )
    );
    expect(api).toHaveBeenCalledWith(`${URL}/envoi`, { method: "POST" });
  });

  it("affiche le motif de l'API si l'envoi échoue", async () => {
    mockApi({
      [`GET ${URL}`]: { recipients: ["a@b.fr"], mailConfigured: true },
      [`POST ${URL}/envoi`]: jsonResponse(
        { error: "Échec de l'envoi de l'e-mail : Authentication failed" },
        409
      ),
    });
    render(<LateReportSection />);
    await waitFor(() => expect(recipientsInput()).toHaveValue("a@b.fr"));

    await userEvent.click(
      screen.getByRole("button", { name: "Envoyer maintenant" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Échec de l'envoi de l'e-mail : Authentication failed"
      )
    );
  });

  it("signale l'échec du chargement", async () => {
    mockApi({ [`GET ${URL}`]: jsonResponse({}, 500) });
    render(<LateReportSection />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de charger le récapitulatif des retards"
      )
    );
  });
});
