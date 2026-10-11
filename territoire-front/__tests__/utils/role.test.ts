import { describe, it, expect } from "vitest";
import { canEditCampaignProgress, canManageCampaigns } from "@/models/role";

describe("campaign permissions", () => {
  it("only admins and supervisors manage campaigns", () => {
    expect(canManageCampaigns("ADMIN")).toBe(true);
    expect(canManageCampaigns("SUPERVISEUR")).toBe(true);
    expect(canManageCampaigns("GESTIONNAIRE")).toBe(false);
    expect(canManageCampaigns("UTILISATEUR")).toBe(false);
    expect(canManageCampaigns(undefined)).toBe(false);
  });

  it("managers can also update campaign progress", () => {
    expect(canEditCampaignProgress("GESTIONNAIRE")).toBe(true);
    expect(canEditCampaignProgress("ADMIN")).toBe(true);
    expect(canEditCampaignProgress("UTILISATEUR")).toBe(false);
    expect(canEditCampaignProgress(null)).toBe(false);
  });
});
