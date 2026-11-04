"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SimplifiedTerritory } from "@/models/territory";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  fetchCampaign,
  updateRemainingTerritories,
  closeCampaign,
  deleteCampaign,
} from "@/store/slices/campaign-slice";
import { CampaignStatisticsComponent } from "@/components/campaigns/campaign-statistics";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import CampaignMap from "@/components/campaigns/campaign-map";
import { canEditCampaignProgress, canManageCampaigns } from "@/models/role";
import {
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const dispatch = useAppDispatch();
  const {
    currentCampaign: campaign,
    loading,
    closing: isClosing,
    deleting: isDeleting,
  } = useAppSelector((state) => state.campaigns);
  const role = useAppSelector((state) => state.auth.user?.role);
  const canManage = canManageCampaigns(role);
  const canEdit = canEditCampaignProgress(role);

  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchCampaign(campaignId))
      .unwrap()
      .then((data) => {
        // Initialize selected territories with the remaining territories
        if (data.remainingTerritories && data.remainingTerritories.length > 0) {
          setSelectedTerritories(
            data.remainingTerritories.map(
              (t: SimplifiedTerritory) => t.territoryId
            )
          );
        }
      })
      .catch((error) => {
        if (error.name === "ConditionError") return;
        console.error("Error fetching campaign:", error);
      });
  }, [campaignId, dispatch]);

  const handleToggleTerritory = (territoryId: string, checked?: boolean) => {
    // Ensure territoryId is not undefined
    if (!territoryId) {
      console.error("Territory ID is undefined in handleToggleTerritory");
      return;
    }

    setSelectedTerritories((prev) => {
      if (checked === false) {
        return prev.filter((id) => id !== territoryId);
      } else if (checked === true) {
        return [...prev, territoryId];
      } else {
        // If checked is undefined, toggle based on current state (backward compatibility)
        if (prev.includes(territoryId)) {
          return prev.filter((id) => id !== territoryId);
        } else {
          return [...prev, territoryId];
        }
      }
    });
  };

  const handleSelectAllInCity = (cityTerritories?: SimplifiedTerritory[]) => {
    if (!campaign) return;

    // Always use the provided cityTerritories parameter if available
    // This ensures we're only working with territories from the specific city
    const territoriesToUse = cityTerritories || [];
    const cityTerritoryIds = territoriesToUse.map(
      (territory) => territory.territoryId
    );

    // Check if all territories in this city are already selected
    const allSelected =
      cityTerritoryIds.length > 0 &&
      cityTerritoryIds.every((id) => selectedTerritories.includes(id));

    if (allSelected) {
      // If all are selected, deselect all territories in this city
      setSelectedTerritories((prev) =>
        prev.filter((id) => !cityTerritoryIds.includes(id))
      );
    } else {
      // If not all are selected, select all territories in this city

      // Create a set of city territory IDs for faster lookup
      const cityTerritoryIdSet = new Set(cityTerritoryIds);

      // Keep only territories that are NOT in the current city
      const otherTerritoriesSelection = selectedTerritories.filter(
        (id) => !cityTerritoryIdSet.has(id)
      );

      // Then add all territories from this city
      setSelectedTerritories([
        ...otherTerritoriesSelection,
        ...cityTerritoryIds,
      ]);
    }
  };

  const handleSaveRemainingTerritories = async () => {
    if (!campaign) return;

    try {
      const remainingTerritories = campaign.territories.filter((territory) =>
        selectedTerritories.includes(territory.territoryId)
      );

      await dispatch(
        updateRemainingTerritories({
          campaignId: campaign.id,
          territories: remainingTerritories,
        })
      ).unwrap();

      toast.success(
        "La liste des territoires restants a été mise à jour avec succès."
      );
    } catch (error) {
      console.error("Error updating remaining territories:", error);
      toast.error(
        "Une erreur est survenue lors de la mise à jour des territoires restants"
      );
    }
  };

  const handleCloseCampaign = async () => {
    if (!campaign) return;

    try {
      // First save the remaining territories
      await handleSaveRemainingTerritories();

      // Then close the campaign
      await dispatch(closeCampaign(campaign.id)).unwrap();

      toast.success(
        "La campagne a été clôturée avec succès et les assignations ont été créées."
      );

      setShowCloseDialog(false);
    } catch (error) {
      console.error("Error closing campaign:", error);
      toast.error("Une erreur est survenue lors de la clôture de la campagne");
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaign) return;

    try {
      await dispatch(deleteCampaign(campaign.id)).unwrap();

      toast.success("La campagne a été supprimée avec succès.");

      // Navigate back to the campaigns list
      router.push("/campagnes");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error(
        "Une erreur est survenue lors de la suppression de la campagne"
      );
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  if (loading) {
    return <LoadingState message="Chargement des détails de la campagne..." />;
  }

  if (!campaign) {
    return <LoadingState message="Campagne non trouvée" />;
  }

  return (
    <PageContainer>
      <PageHeader
        back={{ href: "/campagnes", label: "Retour aux campagnes" }}
        title={campaign.name}
        description={
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="flex items-center gap-2">
                <Calendar aria-hidden="true" className="h-4 w-4" />
                Début : {formatDate(campaign.startDate)}
              </span>
              {campaign.endDate && (
                <span className="flex items-center gap-2">
                  <Calendar aria-hidden="true" className="h-4 w-4" />
                  Fin : {formatDate(campaign.endDate)}
                </span>
              )}
            </div>
            <p>{campaign.description || "Aucune description"}</p>
          </div>
        }
        actions={
          !campaign.closed &&
          canManage && (
            <>
              <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive-outline">
                    Clôturer la campagne
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Clôturer la campagne</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir clôturer cette campagne ? Cette
                      action créera des assignations pour tous les territoires
                      qui ont été utilisés pendant la campagne et ne pourra pas
                      être annulée.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCloseDialog(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCloseCampaign}
                      disabled={isClosing}
                    >
                      {isClosing
                        ? "Clôture en cours..."
                        : "Clôturer la campagne"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive-outline">
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Supprimer la campagne</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer cette campagne ? Cette
                      action ne pourra pas être annulée.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteCampaign}
                      disabled={isDeleting}
                    >
                      {isDeleting
                        ? "Suppression en cours..."
                        : "Supprimer la campagne"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )
        }
      />

      <Tabs defaultValue="configuration">
        <TabsList className="mb-6 w-full max-w-lg mx-auto">
          <TabsTrigger value="configuration" className="flex-1">
            Configuration
          </TabsTrigger>
          <TabsTrigger value="map" className="flex-1">
            Vue Carte
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex-1">
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Territoires de la campagne</CardTitle>
              <CardDescription>
                {campaign.closed
                  ? "Liste des territoires qui ont été utilisés pendant cette campagne"
                  : "Sélectionnez les territoires qui restent à la fin de la campagne"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.territories.length === 0 ? (
                <div className="flex justify-center items-center h-40 bg-gray-50 rounded-lg">
                  <p className="text-lg text-gray-500">
                    Aucun territoire dans cette campagne
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Group territories by city */}
                  {Object.entries(
                    campaign.territories.reduce(
                      (acc, territory) => {
                        const cityName = territory.cityName;
                        if (!acc[cityName]) {
                          acc[cityName] = [];
                        }
                        acc[cityName].push(territory);
                        return acc;
                      },
                      {} as Record<string, SimplifiedTerritory[]>
                    )
                  )
                    .sort(([cityNameA], [cityNameB]) =>
                      cityNameA.localeCompare(cityNameB)
                    )
                    .map(([cityName, territories]) => (
                      <div
                        key={cityName}
                        className="border rounded-lg p-3 md:p-6 shadow-sm"
                      >
                        <div className="flex flex-wrap gap-2 justify-between items-center mb-5 pb-2 border-b">
                          <h3 className="text-xl font-semibold">{cityName}</h3>
                          {!campaign.closed && canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAllInCity(territories)}
                              className="text-sm"
                            >
                              {territories.every((t) =>
                                selectedTerritories.includes(t.territoryId)
                              )
                                ? "Tout désélectionner"
                                : "Tout sélectionner"}
                            </Button>
                          )}
                        </div>
                        {/* Téléphone : pas de zone qui défile dans la page */}
                        <div className="md:max-h-60 md:overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow className="border-b-2 border-gray-200">
                                {!campaign.closed && (
                                  <TableHead className="w-12 py-3"></TableHead>
                                )}
                                <TableHead className="py-3 font-semibold md:text-base">
                                  Territoire
                                </TableHead>
                                <TableHead className="py-3 font-semibold md:text-base">
                                  Type
                                </TableHead>
                                {campaign.closed && (
                                  <TableHead className="py-3 font-semibold md:text-base">
                                    Statut
                                  </TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...territories]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((territory) => {
                                  const isSelected =
                                    selectedTerritories.includes(
                                      territory.territoryId
                                    );
                                  const isUsed =
                                    campaign.closed &&
                                    !campaign.remainingTerritories.some(
                                      (t) =>
                                        t.territoryId === territory.territoryId
                                    );

                                  return (
                                    <TableRow
                                      key={territory.territoryId}
                                      className="hover:bg-gray-50"
                                    >
                                      {!campaign.closed && (
                                        <TableCell className="py-3">
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              if (!territory) {
                                                console.error(
                                                  "Territory object is undefined in onCheckedChange"
                                                );
                                                return;
                                              }
                                              const id = territory.territoryId;
                                              if (id) {
                                                handleToggleTerritory(
                                                  id,
                                                  checked as boolean
                                                );
                                              } else {
                                                console.error(
                                                  "Territory ID is undefined in onCheckedChange"
                                                );
                                              }
                                            }}
                                            disabled={
                                              campaign.closed || !canEdit
                                            }
                                            className="h-5 w-5"
                                          />
                                        </TableCell>
                                      )}
                                      <TableCell className="font-medium py-3 md:text-base">
                                        {territory.name}
                                      </TableCell>
                                      <TableCell className="py-3 md:text-base">
                                        {territory.type
                                          ? TYPE_TRANSLATIONS[territory.type]
                                          : "N/A"}
                                      </TableCell>
                                      {campaign.closed && (
                                        <TableCell className="py-3">
                                          <Badge
                                            variant={
                                              isUsed ? "success" : "neutral"
                                            }
                                          >
                                            {isUsed ? "Utilisé" : "Non utilisé"}
                                          </Badge>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!campaign.closed && canEdit && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleSaveRemainingTerritories}
                className="px-5 py-2.5 text-base font-medium h-auto"
              >
                Enregistrer les territoires restants
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Carte de la campagne</CardTitle>
              <CardDescription>
                Visualisez la couverture géographique et l&apos;avancement de la
                campagne
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignMap
                campaignId={campaignId}
                remainingTerritoryIds={
                  campaign.closed
                    ? campaign.remainingTerritories.map((t) => t.territoryId)
                    : selectedTerritories
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <CampaignStatisticsComponent campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
