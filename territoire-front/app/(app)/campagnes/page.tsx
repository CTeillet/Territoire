"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Calendar, ChevronRight } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchCampaigns } from "@/store/slices/campaign-slice";
import { canManageCampaigns } from "@/models/role";
import { useIsMobile } from "@/hooks/use-mobile";
import { Campaign } from "@/models/campaign";

const StatusBadge = ({ closed }: { closed: boolean }) =>
  closed ? (
    <Badge variant="neutral">Terminée</Badge>
  ) : (
    <Badge variant="success">En cours</Badge>
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
    <PageContainer>
      <PageHeader
        title="Campagnes"
        description="Gérez les campagnes d'invitation et les assignations de territoires"
        actions={
          canManage && (
            <CreateCampaignDialog
              onCampaignCreated={() => dispatch(fetchCampaigns())}
            />
          )
        }
      />

      {loading ? (
        <LoadingState message="Chargement des campagnes..." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucune campagne trouvée"
          description="Créez votre première campagne pour commencer à gérer les assignations de territoires."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Liste des campagnes</CardTitle>
            <CardDescription>
              Toutes les campagnes d&apos;invitation et leur statut
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Date de début</TableHead>
                    <TableHead>Date de fin</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Territoires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                      </TableCell>
                      <TableCell>{formatDate(campaign.startDate)}</TableCell>
                      <TableCell>{formatDate(campaign.endDate)}</TableCell>
                      <TableCell>
                        <StatusBadge closed={campaign.closed} />
                      </TableCell>
                      <TableCell>{territoriesSummary(campaign)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCampaign(campaign.id)}
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
    </PageContainer>
  );
}
