"use client";

import { useEffect } from "react";
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
import { Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchCampaigns } from "@/store/slices/campaign-slice";
import { canManageCampaigns } from "@/models/role";
import { useIsMobile } from "@/hooks/use-mobile";
import { Campaign } from "@/models/campaign";

const StatusBadge = ({ closed }: { closed: boolean }) => (
  <span
    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
      closed ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
    }`}
  >
    {closed ? "Terminée" : "En cours"}
  </span>
);

const territoriesSummary = (campaign: Campaign) =>
  `${campaign.territories.length} territoires` +
  (campaign.closed
    ? ` (${campaign.territories.length - campaign.remainingTerritories.length} utilisés)`
    : "");

export default function CampaignsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const { campaigns, loading } = useAppSelector((state) => state.campaigns);
  const canManage = canManageCampaigns(
    useAppSelector((state) => state.auth.user?.role)
  );

  // Fetch campaigns on component mount
  useEffect(() => {
    dispatch(fetchCampaigns());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewCampaign = (id: string) => {
    router.push(`/campagnes/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Gestion des campagnes
          </h1>
          <p className="text-gray-500 md:text-lg">
            Gérez les campagnes d&apos;invitation et les assignations de
            territoires
          </p>
        </div>
        {canManage && (
          <CreateCampaignDialog
            onCampaignCreated={() => dispatch(fetchCampaigns())}
          />
        )}
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
            {canManage && (
              <CreateCampaignDialog
                onCampaignCreated={() => dispatch(fetchCampaigns())}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md border-0">
          <CardHeader className="px-4 pb-6 md:px-6">
            <CardTitle className="text-2xl font-bold mb-2">
              Liste des campagnes
            </CardTitle>
            <CardDescription className="text-base">
              Toutes les campagnes d&apos;invitation et leur statut
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {isMobile ? (
              // Téléphone : une fiche par campagne, le tableau ne tient pas sur la largeur
              <ul className="divide-y">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      onClick={() => handleViewCampaign(campaign.id)}
                      className="flex w-full items-center gap-3 py-4 text-left"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{campaign.name}</span>
                          <StatusBadge closed={campaign.closed} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(campaign.startDate)} →{" "}
                          {formatDate(campaign.endDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {territoriesSummary(campaign)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-200">
                    <TableHead className="py-4 text-base font-semibold">
                      Nom
                    </TableHead>
                    <TableHead className="py-4 text-base font-semibold">
                      Date de début
                    </TableHead>
                    <TableHead className="py-4 text-base font-semibold">
                      Date de fin
                    </TableHead>
                    <TableHead className="py-4 text-base font-semibold">
                      Statut
                    </TableHead>
                    <TableHead className="py-4 text-base font-semibold">
                      Territoires
                    </TableHead>
                    <TableHead className="py-4 text-base font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-base py-4">
                        {campaign.name}
                      </TableCell>
                      <TableCell className="py-4">
                        {formatDate(campaign.startDate)}
                      </TableCell>
                      <TableCell className="py-4">
                        {formatDate(campaign.endDate)}
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusBadge closed={campaign.closed} />
                      </TableCell>
                      <TableCell className="py-4">
                        {territoriesSummary(campaign)}
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
