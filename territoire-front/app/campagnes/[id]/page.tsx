"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Calendar, Trash2 } from "lucide-react";
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
import { authFetch } from "@/utils/auth-fetch";
import { SimplifiedTerritory } from "@/models/territory";
import { Campaign } from "@/models/campaign";
import { CampaignStatisticsComponent } from "@/components/campaigns/campaign-statistics";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await authFetch(`/api/campagnes/${campaignId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch campaign");
        }
        const data = await response.json();
        setCampaign(data);

        // Initialize selected territories with the remaining territories
        if (data.remainingTerritories && data.remainingTerritories.length > 0) {
          setSelectedTerritories(data.remainingTerritories.map((t: SimplifiedTerritory) => t.territoryId));
        }
      } catch (error) {
        console.error("Error fetching campaign:", error);
        toast.error("Impossible de charger les détails de la campagne");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

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
    const cityTerritoryIds = territoriesToUse.map(territory => territory.territoryId);

    // Check if all territories in this city are already selected
    const allSelected = cityTerritoryIds.length > 0 && 
                        cityTerritoryIds.every(id => selectedTerritories.includes(id));

    if (allSelected) {
      // If all are selected, deselect all territories in this city
      setSelectedTerritories(prev => prev.filter(id => !cityTerritoryIds.includes(id)));
    } else {
      // If not all are selected, select all territories in this city

      // Create a set of city territory IDs for faster lookup
      const cityTerritoryIdSet = new Set(cityTerritoryIds);

      // Keep only territories that are NOT in the current city
      const otherTerritoriesSelection = selectedTerritories.filter(id => !cityTerritoryIdSet.has(id));

      // Then add all territories from this city
      setSelectedTerritories([...otherTerritoriesSelection, ...cityTerritoryIds]);
    }
  };

  const handleSaveRemainingTerritories = async () => {
    if (!campaign) return;

    try {
      const remainingTerritories = campaign.territories.filter((territory) =>
        selectedTerritories.includes(territory.territoryId)
      );

      const response = await authFetch(`/api/campagnes/${campaign.id}/territoires-restants`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(remainingTerritories),
      });

      if (!response.ok) {
        throw new Error("Failed to update remaining territories");
      }

      const updatedCampaign = await response.json();
      setCampaign(updatedCampaign);

      toast.success("La liste des territoires restants a été mise à jour avec succès.");
    } catch (error) {
      console.error("Error updating remaining territories:", error);
      toast.error("Une erreur est survenue lors de la mise à jour des territoires restants");
    }
  };

  const handleCloseCampaign = async () => {
    if (!campaign) return;

    setIsClosing(true);

    try {
      // First save the remaining territories
      await handleSaveRemainingTerritories();

      // Then close the campaign
      const response = await authFetch(`/api/campagnes/${campaign.id}/fermer`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to close campaign");
      }

      const closedCampaign = await response.json();
      setCampaign(closedCampaign);

      toast.success("La campagne a été clôturée avec succès et les assignations ont été créées.");

      setShowCloseDialog(false);
    } catch (error) {
      console.error("Error closing campaign:", error);
      toast.error("Une erreur est survenue lors de la clôture de la campagne");
    } finally {
      setIsClosing(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaign) return;

    setIsDeleting(true);

    try {
      const response = await authFetch(`/api/campagnes/${campaign.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }

      toast.success("La campagne a été supprimée avec succès.");

      // Navigate back to the campaigns list
      router.push("/campagnes");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Une erreur est survenue lors de la suppression de la campagne");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-6">
        <div className="flex justify-center items-center h-64">
          <p>Chargement des détails de la campagne...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-6 px-6">
        <div className="flex justify-center items-center h-64">
          <p>Campagne non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <Button
        variant="ghost"
        className="mb-8 text-base hover:bg-gray-100"
        onClick={() => router.push("/campagnes")}
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Retour aux campagnes
      </Button>

      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">{campaign.name}</h1>
          <div className="flex items-center space-x-6 mb-3">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-500" />
              <span className="text-base">
                Début: {formatDate(campaign.startDate)}
              </span>
            </div>
            {campaign.endDate && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-base">
                  Fin: {formatDate(campaign.endDate)}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-lg mb-4">
            {campaign.description || "Aucune description"}
          </p>
        </div>

        {!campaign.closed && (
          <div className="flex space-x-4">
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="px-5 py-2.5 text-base font-medium h-auto"
                >
                  Clôturer la campagne
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-2xl font-bold">Clôturer la campagne</DialogTitle>
                  <DialogDescription className="mt-2 text-base">
                    Êtes-vous sûr de vouloir clôturer cette campagne ? Cette action créera des assignations pour tous les territoires qui ont été utilisés pendant la campagne et ne pourra pas être annulée.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCloseDialog(false)}
                    className="px-5"
                  >
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleCloseCampaign} 
                    disabled={isClosing}
                    className="px-5"
                  >
                    {isClosing ? "Clôture en cours..." : "Clôturer la campagne"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center px-5 py-2.5 text-base font-medium h-auto"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Supprimer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-2xl font-bold">Supprimer la campagne</DialogTitle>
                  <DialogDescription className="mt-2 text-base">
                    Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action ne pourra pas être annulée.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteDialog(false)}
                    className="px-5"
                  >
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteCampaign} 
                    disabled={isDeleting}
                    className="px-5"
                  >
                    {isDeleting ? "Suppression en cours..." : "Supprimer la campagne"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="configuration" className="mt-8">
        <TabsList className="mb-6 w-full max-w-md mx-auto">
          <TabsTrigger value="configuration" className="flex-1">Configuration</TabsTrigger>
          <TabsTrigger value="statistics" className="flex-1">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card className="shadow-md border-0">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold mb-2">Territoires de la campagne</CardTitle>
              <CardDescription className="text-base">
                {campaign.closed
                  ? "Liste des territoires qui ont été utilisés pendant cette campagne"
                  : "Sélectionnez les territoires qui restent à la fin de la campagne"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.territories.length === 0 ? (
                <div className="flex justify-center items-center h-40 bg-gray-50 rounded-lg">
                  <p className="text-lg text-gray-500">Aucun territoire dans cette campagne</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Group territories by city */}
                  {Object.entries(
                    campaign.territories.reduce((acc, territory) => {
                      const cityName = territory.cityName;
                      if (!acc[cityName]) {
                        acc[cityName] = [];
                      }
                      acc[cityName].push(territory);
                      return acc;
                    }, {} as Record<string, SimplifiedTerritory[]>)
                  )
                  .sort(([cityNameA], [cityNameB]) => cityNameA.localeCompare(cityNameB))
                  .map(([cityName, territories]) => (
                    <div key={cityName} className="border rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-5 pb-2 border-b">
                        <h3 className="text-xl font-semibold">{cityName}</h3>
                        {!campaign.closed && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectAllInCity(territories)}
                            className="text-sm"
                          >
                            {territories.every(t => selectedTerritories.includes(t.territoryId))
                              ? "Tout désélectionner"
                              : "Tout sélectionner"}
                          </Button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white z-10">
                            <TableRow className="border-b-2 border-gray-200">
                              {!campaign.closed && <TableHead className="w-12 py-3"></TableHead>}
                              <TableHead className="py-3 text-base font-semibold">Nom du territoire</TableHead>
                              {campaign.closed && <TableHead className="py-3 text-base font-semibold">Statut</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...territories].sort((a, b) => a.name.localeCompare(b.name)).map((territory) => {
                              console.log(territory)
                              const isSelected = selectedTerritories.includes(territory.territoryId);
                              const isUsed = campaign.closed && !campaign.remainingTerritories.some(t => t.territoryId === territory.territoryId);

                              return (
                                <TableRow key={territory.territoryId} className="hover:bg-gray-50">
                                  {!campaign.closed && (
                                    <TableCell className="py-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (!territory) {
                                            console.error("Territory object is undefined in onCheckedChange");
                                            return;
                                          }
                                          const id = territory.territoryId;
                                          console.log("Checkbox onCheckedChange", id, checked);
                                          if (id) {
                                            handleToggleTerritory(id, checked as boolean);
                                          } else {
                                            console.error("Territory ID is undefined in onCheckedChange");
                                          }
                                        }}
                                        disabled={campaign.closed}
                                        className="h-5 w-5"
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium text-base py-3">{territory.name}</TableCell>
                                  {campaign.closed && (
                                    <TableCell className="py-3">
                                      <span
                                        className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                                          isUsed
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {isUsed ? "Utilisé" : "Non utilisé"}
                                      </span>
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

          {!campaign.closed && (
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

        <TabsContent value="statistics">
          <CampaignStatisticsComponent campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
