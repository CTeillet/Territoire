import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "@/components/parameters/user-management/user-management";
import CityManager from "@/components/parameters/city-management/city-management";
import { toast } from "sonner";
import { PASSWORD_MIN_LENGTH } from "@/utils/password";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

const bodyOf = (api: ReturnType<typeof mockApi>, method: string) =>
  JSON.parse(
    String(api.mock.calls.find(([, init]) => init?.method === method)![1]?.body)
  );

describe("Gestion des utilisateurs", () => {
  // u1 = utilisateur connecté (cf. test-utils)
  const users = [
    { id: "u1", username: "Alice", email: "a@b.fr", role: "ADMIN" },
    { id: "u2", username: "Bob", email: "bob@exemple.fr", role: "UTILISATEUR" },
  ];
  let api: ReturnType<typeof mockApi>;

  const setup = (extra: Record<string, unknown> = {}) => {
    api = mockApi({
      "GET /api/utilisateurs": users,
      "PUT /api/utilisateurs/u2/role": (init?: RequestInit) => ({
        ...users[1],
        ...JSON.parse(String(init?.body)),
      }),
      "DELETE /api/utilisateurs/u2": null,
      "POST /api/utilisateurs": (init?: RequestInit) => {
        const { username, email, role } = JSON.parse(String(init?.body));
        return { id: "u3", username, email, role };
      },
      ...extra,
    });
    renderWithStore(<UserManagement />);
  };

  it("liste les utilisateurs et empêche de se supprimer soi-même", async () => {
    setup();

    expect(await screen.findByText("bob@exemple.fr")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vous" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Supprimer Alice" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Rôle de Bob" })
    ).toHaveTextContent("Utilisateur");
  });

  it("affiche le chargement", () => {
    mockApi({ "GET /api/utilisateurs": () => new Promise(() => {}) });
    renderWithStore(<UserManagement />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("change le rôle d'un utilisateur", async () => {
    setup();

    await userEvent.click(
      await screen.findByRole("combobox", { name: "Rôle de Bob" })
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Gestionnaire" })
    );

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Rôle de Bob" })
      ).toHaveTextContent("Gestionnaire")
    );
    expect(bodyOf(api, "PUT")).toEqual({ role: "GESTIONNAIRE" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("garde l'ancien rôle et affiche le motif quand le serveur refuse (dernier administrateur)", async () => {
    setup({
      "PUT /api/utilisateurs/u1/role": jsonResponse(
        { error: "Impossible : il doit rester au moins un administrateur" },
        409
      ),
    });

    await userEvent.click(
      await screen.findByRole("combobox", { name: "Rôle de Alice" })
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Utilisateur" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible : il doit rester au moins un administrateur"
      )
    );
    expect(
      screen.getByRole("combobox", { name: "Rôle de Alice" })
    ).toHaveTextContent("Admin");
  });

  it("supprime un utilisateur après confirmation", async () => {
    setup();

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Bob" })
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(
      "Êtes-vous sûr de vouloir supprimer Bob ?"
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Supprimer" })
    );

    await waitFor(() =>
      expect(screen.queryByText("bob@exemple.fr")).not.toBeInTheDocument()
    );
  });

  it("signale l'échec de la suppression", async () => {
    setup({ "DELETE /api/utilisateurs/u2": jsonResponse({}, 500) });

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Bob" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression de l'utilisateur"
      )
    );
    expect(screen.getByText("bob@exemple.fr")).toBeInTheDocument();
  });

  it("crée un utilisateur avec un mot de passe généré", async () => {
    setup();
    await screen.findByText("bob@exemple.fr");

    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter un utilisateur" })
    );
    const dialog = await screen.findByRole("alertdialog");
    const password = within(dialog).getByLabelText(
      "Mot de passe"
    ) as HTMLInputElement;
    const generated = password.value;
    expect(generated.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "Générer un nouveau mot de passe",
      })
    );
    expect(password.value).not.toBe(generated);

    await userEvent.type(within(dialog).getByLabelText("Nom"), "Chloé");
    await userEvent.type(
      within(dialog).getByLabelText("Email"),
      "chloe@exemple.fr"
    );
    await userEvent.click(within(dialog).getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Superviseur" })
    );
    const sentPassword = password.value;
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Créer" })
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Utilisateur créé")
    );
    expect(bodyOf(api, "POST")).toEqual({
      username: "Chloé",
      email: "chloe@exemple.fr",
      role: "SUPERVISEUR",
      password: sentPassword,
    });
    expect(await screen.findByText("chloe@exemple.fr")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("valide le formulaire de création", async () => {
    setup();

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter un utilisateur" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Créer",
      })
    );

    expect(await screen.findByText("Nom requis")).toBeInTheDocument();
    expect(screen.getByText("Email invalide")).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false
    );
  });

  it("affiche le motif du refus de création", async () => {
    setup({
      "POST /api/utilisateurs": jsonResponse(
        { error: "Email déjà utilisé" },
        409
      ),
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter un utilisateur" })
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText("Nom"), "Bob 2");
    await userEvent.type(
      within(dialog).getByLabelText("Email"),
      "bob@exemple.fr"
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Créer" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Email déjà utilisé")
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("Gestion des villes", () => {
  const cities = [
    { id: "c1", name: "Rennes", zipCode: "35000", colorHex: "#3498db" },
    { id: "c2", name: "Cesson", zipCode: "35510", colorHex: null },
  ];
  let api: ReturnType<typeof mockApi>;

  const setup = (extra: Record<string, unknown> = {}) => {
    api = mockApi({
      "GET /api/villes": cities,
      "POST /api/villes": (init?: RequestInit) => ({
        id: "c3",
        ...JSON.parse(String(init?.body)),
      }),
      "DELETE /api/villes/c2": null,
      "PATCH /api/villes/c1/couleur": (init?: RequestInit) => ({
        ...cities[0],
        ...JSON.parse(String(init?.body)),
      }),
      ...extra,
    });
    renderWithStore(<CityManager />, "ADMIN", { cities: { cities: [] } });
  };

  it("liste les villes avec leur couleur (gris par défaut)", async () => {
    setup();

    expect(await screen.findByText("Cesson")).toBeInTheDocument();
    expect(screen.getByLabelText("Choisir couleur pour Rennes")).toHaveValue(
      "#3498db"
    );
    expect(screen.getByLabelText("Choisir couleur pour Cesson")).toHaveValue(
      "#cccccc"
    );
    expect(screen.getByTitle("#cccccc")).toBeInTheDocument();
  });

  it("affiche l'erreur de chargement", async () => {
    setup({ "GET /api/villes": jsonResponse({}, 500) });

    expect(
      await screen.findByText(
        "Erreur : Erreur lors de la récupération des villes"
      )
    ).toBeInTheDocument();
  });

  it("ajoute une ville et vide le formulaire", async () => {
    setup();
    await screen.findByText("Cesson");

    await userEvent.type(
      screen.getByPlaceholderText("Nom de la ville"),
      "Vern"
    );
    await userEvent.type(screen.getByPlaceholderText("Code postal"), "35770");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la ville" })
    );

    expect(await screen.findByText("Vern")).toBeInTheDocument();
    expect(bodyOf(api, "POST")).toEqual({
      name: "Vern",
      zipCode: "35770",
      colorHex: "#0088ff",
    });
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Nom de la ville")).toHaveValue("")
    );
  });

  it("valide le nom et le code postal", async () => {
    setup();

    await userEvent.type(screen.getByPlaceholderText("Code postal"), "123");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la ville" })
    );

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
    expect(
      screen.getByText("Le code postal doit contenir au moins 5 caractères")
    ).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false
    );
  });

  it("garde la saisie et affiche le motif quand l'ajout échoue", async () => {
    setup({
      "POST /api/villes": jsonResponse({ error: "Code postal inconnu" }, 400),
    });

    await userEvent.type(
      screen.getByPlaceholderText("Nom de la ville"),
      "Vern"
    );
    await userEvent.type(screen.getByPlaceholderText("Code postal"), "99999");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la ville" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Code postal inconnu")
    );
    expect(screen.getByPlaceholderText("Nom de la ville")).toHaveValue("Vern");
  });

  it("supprime une ville vide", async () => {
    setup();

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Cesson" })
    );

    await waitFor(() =>
      expect(screen.queryByText("Cesson")).not.toBeInTheDocument()
    );
  });

  it("explique pourquoi une ville contenant des territoires n'est pas supprimée", async () => {
    const reason =
      "Impossible de supprimer cette ville : elle contient encore des territoires";
    setup({ "DELETE /api/villes/c1": jsonResponse({ error: reason }, 409) });

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Rennes" })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(reason));
    expect(screen.getByText("Rennes")).toBeInTheDocument();
  });

  it("change la couleur d'une ville", async () => {
    setup();

    fireEvent.change(
      await screen.findByLabelText("Choisir couleur pour Rennes"),
      { target: { value: "#ff0000" } }
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Choisir couleur pour Rennes")).toHaveValue(
        "#ff0000"
      )
    );
    expect(bodyOf(api, "PATCH")).toEqual({ colorHex: "#ff0000" });
  });

  it("signale l'échec du changement de couleur", async () => {
    setup({ "PATCH /api/villes/c1/couleur": jsonResponse({}, 500) });

    fireEvent.change(
      await screen.findByLabelText("Choisir couleur pour Rennes"),
      { target: { value: "#ff0000" } }
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la mise à jour de la couleur"
      )
    );
    expect(screen.getByLabelText("Choisir couleur pour Rennes")).toHaveValue(
      "#3498db"
    );
  });
});
