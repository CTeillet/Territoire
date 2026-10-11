import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authFetchModule from "@/utils/auth-fetch";
import {
  canManageAccess,
  canSendAccess,
  fetchAccessSettings,
  fetchAllAccesses,
  fetchPersonAccess,
  regeneratePersonAccess,
  revokePersonAccess,
  saveAccessSettings,
  sendPersonAccess,
  updatePersonAccessExpiration,
} from "@/lib/person-access-api";
import { jsonResponse } from "../test-utils";

describe("person-access-api", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    authFetch = vi
      .spyOn(authFetchModule, "authFetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
  });

  it("appelle les bons endpoints avec les bonnes méthodes", async () => {
    await fetchAllAccesses();
    await fetchPersonAccess("p1");
    await sendPersonAccess("p1");
    await regeneratePersonAccess("p1");
    await revokePersonAccess("p1");
    await updatePersonAccessExpiration("p1", "2026-12-31");
    await fetchAccessSettings();
    await saveAccessSettings({
      assignmentNotificationEnabled: true,
      assignmentMessage: "a",
      accessLinkMessage: "b",
    });

    expect(authFetch.mock.calls).toEqual([
      ["/api/acces", {}],
      ["/api/personnes/p1/acces", {}],
      ["/api/personnes/p1/acces/envoyer", { method: "POST" }],
      ["/api/personnes/p1/acces/regenerer", { method: "POST" }],
      ["/api/personnes/p1/acces/revoquer", { method: "POST" }],
      [
        "/api/personnes/p1/acces/expiration",
        { method: "PUT", body: JSON.stringify({ expiresAt: "2026-12-31" }) },
      ],
      ["/api/settings/acces-numerique", {}],
      [
        "/api/settings/acces-numerique",
        {
          method: "PUT",
          body: JSON.stringify({
            assignmentNotificationEnabled: true,
            assignmentMessage: "a",
            accessLinkMessage: "b",
          }),
        },
      ],
    ]);
  });

  it("renvoie le message d'erreur de l'API", async () => {
    authFetch.mockResolvedValue(
      jsonResponse({ error: "Le lien est révoqué" }, 409)
    );

    await expect(sendPersonAccess("p1")).rejects.toThrow("Le lien est révoqué");
  });

  it("utilise un message par défaut si l'API n'en fournit pas", async () => {
    authFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("pas du JSON");
      },
    } as unknown as Response);

    await expect(revokePersonAccess("p1")).rejects.toThrow(
      "Impossible de révoquer le lien"
    );
  });

  it("définit les droits par rôle", () => {
    expect(canManageAccess("ADMIN")).toBe(true);
    expect(canManageAccess("SUPERVISEUR")).toBe(true);
    expect(canManageAccess("GESTIONNAIRE")).toBe(false);
    expect(canSendAccess("GESTIONNAIRE")).toBe(true);
    expect(canSendAccess("UTILISATEUR")).toBe(false);
    expect(canSendAccess(null)).toBe(false);
  });
});
