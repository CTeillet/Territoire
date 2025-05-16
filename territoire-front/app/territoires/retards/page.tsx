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
import { toast } from "sonner";
import { authFetch } from "@/utils/auth-fetch";
import { Territory } from "@/models/territory";
import { TerritoryReminder } from "@/models/territory-reminder";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function LateTerritoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [reminders, setReminders] = useState<TerritoryReminder[]>([]);

  // Fetch late territories and reminders
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all territories
      const territoriesResponse = await authFetch("/api/territoires");
      if (!territoriesResponse.ok) {
        throw new Error("Failed to fetch territories");
      }
      const territoriesData = await territoriesResponse.json();

      // Filter late territories
      const lateTerritories = territoriesData.filter(
        (territory: Territory) => territory.status === "LATE"
      );
      setTerritories(lateTerritories);

      // Fetch all reminders
      const remindersResponse = await authFetch("/api/territory-reminders");
      if (!remindersResponse.ok) {
        throw new Error("Failed to fetch reminders");
      }
      const remindersData = await remindersResponse.json();
      setReminders(remindersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Impossible de récupérer les données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    console.log(territories);
  }, [territories]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  // Check if a territory has a reminder for the assigned person
  const hasReminder = (territoryId: string, personId: string) => {
    return reminders.some(
      (reminder) =>
        reminder.territoryId === territoryId && reminder.personId === personId
    );
  };

  // Send a reminder
  const sendReminder = async (territoryId: string, personId: string) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté pour envoyer un rappel");
      return;
    }

    try {
      const response = await authFetch(
        `/api/territory-reminders?territoryId=${territoryId}&personId=${personId}&remindedById=${user.id}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send reminder");
      }

      toast.success("Rappel envoyé avec succès");

      // Refresh data
      fetchData();
    } catch (error: unknown) {
      console.error("Error sending reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer le rappel";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-3">Territoires en retard</h1>
          <p className="text-gray-500 text-lg">
            Gérez les territoires en retard et envoyez des rappels
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Chargement des territoires en retard...</p>
        </div>
      ) : territories.length === 0 ? (
        <Card className="shadow-md border-0">
          <CardContent className="flex flex-col items-center justify-center h-80 py-12">
            <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
            <h3 className="text-2xl font-semibold mb-3">
              Aucun territoire en retard
            </h3>
            <p className="text-gray-500 text-center text-lg mb-6 max-w-md">
              Tous les territoires sont à jour. Revenez plus tard pour vérifier.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold mb-2">
              Liste des territoires en retard
            </CardTitle>
            <CardDescription className="text-base">
              Envoyez des rappels aux personnes ayant des territoires en retard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-gray-200">
                  <TableHead className="py-4 text-base font-semibold">Territoire</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Ville</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Assigné à</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Date d&apos;assignation</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Date d&apos;échéance</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Statut du rappel</TableHead>
                  <TableHead className="py-4 text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {territories.map((territory) => (
                  <TableRow key={territory.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-base py-4">
                      {territory.name}
                    </TableCell>
                    <TableCell className="py-4">{territory.city.name}</TableCell>
                    <TableCell className="py-4">{territory.assignedTo}</TableCell>
                    <TableCell className="py-4">{formatDate(territory.assignedOn)}</TableCell>
                    <TableCell className="py-4">{formatDate(territory.waitedFor)}</TableCell>
                    <TableCell className="py-4">
                      {hasReminder(territory.id, territory.assignedTo) ? (
                        <Badge className="bg-green-500 text-white px-2 py-1 rounded">
                          Rappel envoyé
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500 text-white px-2 py-1 rounded">
                          Pas de rappel
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendReminder(territory.id, territory.assignedTo)}
                        disabled={hasReminder(territory.id, territory.assignedTo)}
                        className="px-4 py-2 font-medium"
                      >
                        {hasReminder(territory.id, territory.assignedTo)
                          ? "Déjà rappelé"
                          : "Envoyer un rappel"}
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
