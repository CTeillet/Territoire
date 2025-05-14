"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { authFetch } from "@/utils/auth-fetch";
import { Campaign } from "@/models/campaign";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/campagnes");
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleViewCampaign = (id: string) => {
    router.push(`/campagnes/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-3">Gestion des campagnes</h1>
          <p className="text-gray-500 text-lg">
            Gérez les campagnes d&apos;invitation et les assignations de territoires
          </p>
        </div>
        <CreateCampaignDialog onCampaignCreated={fetchCampaigns} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Chargement des campagnes...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="shadow-md border-0">
          <CardContent className="flex flex-col items-center justify-center h-80 py-12">
            <Calendar className="h-20 w-20 text-gray-400 mb-6" />
            <h3 className="text-2xl font-semibold mb-3">
              Aucune campagne trouvée
            </h3>
            <p className="text-gray-500 text-center text-lg mb-6 max-w-md">
              Créez votre première campagne pour commencer à gérer les
              assignations de territoires.
            </p>
            <CreateCampaignDialog onCampaignCreated={fetchCampaigns} />
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold mb-2">Liste des campagnes</CardTitle>
            <CardDescription className="text-base">
              Toutes les campagnes d&apos;invitation et leur statut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-gray-200">
                  <TableHead className="py-4 text-base font-semibold">Nom</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Date de début</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Date de fin</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Statut</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Territoires</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-base py-4">
                      {campaign.name}
                    </TableCell>
                    <TableCell className="py-4">{formatDate(campaign.startDate)}</TableCell>
                    <TableCell className="py-4">{formatDate(campaign.endDate)}</TableCell>
                    <TableCell className="py-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                          campaign.closed
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {campaign.closed ? "Terminée" : "En cours"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      {campaign.territories.length} territoires
                      {campaign.closed &&
                        ` (${campaign.territories.length - campaign.remainingTerritories.length} utilisés)`}
                    </TableCell>
                    <TableCell className="py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCampaign(campaign.id)}
                        className="px-4 py-2 font-medium"
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
