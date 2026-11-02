import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ReminderDialog,
  ReminderDialogData,
} from "@/components/late-territory/reminder-dialog";
import * as authFetchModule from "@/utils/auth-fetch";
import { toast } from "sonner";
import { jsonResponse } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const data = (): ReminderDialogData => ({
  person: {
    id: "p1",
    name: "Jean Dupont",
    firstName: "Jean",
    phone: "+33600000000",
  },
  territories: [
    {
      id: "t1",
      name: "R-12",
      assignedOn: "2026-01-01",
      waitedFor: "2026-05-01",
    },
  ],
});

const textResponse = (text: string): Response =>
  ({ ok: true, status: 200, text: async () => text }) as Response;

const TEMPLATE =
  "Salut {{ person.firstName }}, {{ territories[0].name }} : {{ link }}";

describe("ReminderDialog", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    authFetch = vi
      .spyOn(authFetchModule, "authFetch")
      .mockImplementation(async (url: string) =>
        url === "/api/settings/late-reminder-message"
          ? textResponse(TEMPLATE)
          : jsonResponse({ status: "ACTIF", link: "https://tms.example/m/abc" })
      );
  });

  const dialog = (
    props: Partial<React.ComponentProps<typeof ReminderDialog>> = {}
  ) => (
    <ReminderDialog
      title="Rappeler tout"
      canSendWhatsApp
      onManualReminders={vi.fn()}
      onSendWhatsApp={vi.fn()}
      data={data()}
      {...props}
    />
  );

  it("ne charge rien tant que la boîte de dialogue est fermée, même si le parent se re-rend", () => {
    const { rerender } = render(dialog());
    rerender(dialog());

    expect(authFetch).not.toHaveBeenCalled();
  });

  it("à l'ouverture, rend le message avec le lien personnel", async () => {
    render(dialog());

    await userEvent.click(screen.getByText("Rappeler tout"));

    expect(
      await screen.findByDisplayValue(
        "Salut Jean, R-12 : https://tms.example/m/abc"
      )
    ).toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledWith("/api/personnes/p1/acces");
  });

  it("laisse la variable link vide si la personne n'a pas de lien actif", async () => {
    authFetch.mockImplementation(async (url: string) =>
      url === "/api/settings/late-reminder-message"
        ? textResponse("Lien : [{{ link }}]")
        : jsonResponse({ error: "interdit" }, 403)
    );
    render(dialog());

    await userEvent.click(screen.getByText("Rappeler tout"));

    expect(await screen.findByDisplayValue("Lien : []")).toBeInTheDocument();
  });

  it("ne relance pas le chargement quand le parent se re-rend pendant la saisie", async () => {
    const { rerender } = render(dialog());
    await userEvent.click(screen.getByText("Rappeler tout"));
    const textarea = await screen.findByDisplayValue(/Salut Jean/);
    await userEvent.type(textarea, " Merci !");

    rerender(dialog());

    expect(screen.getByDisplayValue(/Merci !$/)).toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("envoie le message saisi par WhatsApp", async () => {
    const onSendWhatsApp = vi.fn();
    render(dialog({ onSendWhatsApp }));

    await userEvent.click(screen.getByText("Rappeler tout"));
    await screen.findByDisplayValue(/Salut Jean/);
    await userEvent.click(screen.getByText("Envoyer par WhatsApp"));

    expect(onSendWhatsApp).toHaveBeenCalledWith(
      "p1",
      "Salut Jean, R-12 : https://tms.example/m/abc",
      ["t1"]
    );
  });

  it("propose d'enregistrer les rappels sans WhatsApp", async () => {
    const onManualReminders = vi.fn();
    render(dialog({ onManualReminders }));

    await userEvent.click(screen.getByText("Rappeler tout"));
    await userEvent.click(screen.getByText("Marquer rappels envoyés"));

    expect(onManualReminders).toHaveBeenCalledWith(["t1"]);
  });

  describe("choix des territoires", () => {
    const LIST_TEMPLATE =
      "Territoires : {% for t in territories %}{{ t.name }};{% endfor %}";

    const threeTerritories = (): ReminderDialogData => ({
      ...data(),
      territories: [
        {
          id: "t1",
          name: "R-12",
          assignedOn: "2026-01-01",
          waitedFor: "2026-05-01",
        },
        {
          id: "t2",
          name: "R-13",
          assignedOn: "2026-01-01",
          waitedFor: "2026-03-01",
        },
        {
          id: "t3",
          name: "R-14",
          assignedOn: "2026-01-01",
          waitedFor: "2026-04-01",
          reminded: true,
        },
      ],
    });

    beforeEach(() => {
      authFetch.mockImplementation(async (url: string) =>
        url === "/api/settings/late-reminder-message"
          ? textResponse(LIST_TEMPLATE)
          : jsonResponse({ error: "interdit" }, 403)
      );
    });

    const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });

    it("sélectionne à l'ouverture les seuls territoires pas encore rappelés", async () => {
      render(dialog({ data: threeTerritories() }));

      await userEvent.click(screen.getByText("Rappeler tout"));

      expect(checkbox(/R-12/)).toBeChecked();
      expect(checkbox(/R-13/)).toBeChecked();
      expect(checkbox(/R-14/)).not.toBeChecked();
      expect(checkbox(/R-14/)).toHaveAccessibleName(/Déjà rappelé/);
      expect(
        await screen.findByDisplayValue("Territoires : R-12;R-13;")
      ).toBeInTheDocument();
    });

    it("limite le message et les actions aux territoires sélectionnés", async () => {
      const onSendWhatsApp = vi.fn();
      const onManualReminders = vi.fn();
      render(
        dialog({ data: threeTerritories(), onSendWhatsApp, onManualReminders })
      );
      await userEvent.click(screen.getByText("Rappeler tout"));
      await screen.findByDisplayValue("Territoires : R-12;R-13;");

      await userEvent.click(checkbox(/R-12/));
      await userEvent.click(checkbox(/R-14/));

      expect(
        screen.getByDisplayValue("Territoires : R-13;R-14;")
      ).toBeInTheDocument();
      await userEvent.click(screen.getByText("Envoyer par WhatsApp"));
      expect(onSendWhatsApp).toHaveBeenCalledWith(
        "p1",
        "Territoires : R-13;R-14;",
        ["t2", "t3"]
      );
      await userEvent.click(screen.getByText("Marquer rappels envoyés"));
      expect(onManualReminders).toHaveBeenCalledWith(["t2", "t3"]);
    });

    it("garde le message modifié quand la sélection change, jusqu'à le régénérer", async () => {
      render(dialog({ data: threeTerritories() }));
      await userEvent.click(screen.getByText("Rappeler tout"));
      const textarea = await screen.findByDisplayValue(
        "Territoires : R-12;R-13;"
      );
      await userEvent.type(textarea, " Merci !");

      await userEvent.click(checkbox(/R-13/));

      expect(textarea).toHaveValue("Territoires : R-12;R-13; Merci !");
      expect(
        screen.getByText("Message modifié : il ne suit plus la sélection.")
      ).toBeInTheDocument();

      await userEvent.click(screen.getByText("Régénérer le message"));

      expect(textarea).toHaveValue("Territoires : R-12;");
    });

    it("désactive les actions tant qu'aucun territoire à rappeler n'est sélectionné", async () => {
      render(dialog({ data: threeTerritories() }));
      await userEvent.click(screen.getByText("Rappeler tout"));
      await screen.findByDisplayValue("Territoires : R-12;R-13;");

      await userEvent.click(checkbox(/R-12/));
      await userEvent.click(checkbox(/R-13/));
      // Un territoire déjà rappelé ne suffit pas à justifier un nouveau rappel
      await userEvent.click(checkbox(/R-14/));

      expect(
        screen.getByText(
          "Sélectionnez au moins un territoire pas encore rappelé."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Marquer rappels envoyés").closest("button")
      ).toBeDisabled();
      expect(
        screen.getByText("Envoyer par WhatsApp").closest("button")
      ).toBeDisabled();
    });

    it("rétablit la sélection par défaut à chaque ouverture", async () => {
      render(dialog({ data: threeTerritories() }));
      await userEvent.click(screen.getByText("Rappeler tout"));
      await userEvent.click(checkbox(/R-12/));
      await userEvent.click(screen.getByText("Annuler"));

      await userEvent.click(screen.getByText("Rappeler tout"));

      expect(checkbox(/R-12/)).toBeChecked();
    });
  });

  it("sans numéro, n'appelle pas l'API et désactive l'envoi", async () => {
    render(dialog({ canSendWhatsApp: false }));

    await userEvent.click(screen.getByText("Rappeler tout"));

    expect(screen.getByText(/Aucun numéro de téléphone/)).toBeInTheDocument();
    expect(
      screen.getByText("Envoyer par WhatsApp").closest("button")
    ).toBeDisabled();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("signale un échec de chargement du message", async () => {
    authFetch.mockRejectedValue(new Error("réseau"));
    render(dialog());

    await userEvent.click(screen.getByText("Rappeler tout"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de charger le message type"
      )
    );
  });
});
